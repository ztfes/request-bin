"""
Retention sweeps for expired bins and requests.

Three rules, all configurable via env vars:

* a bin is deleted once `BIN_TTL_HOURS` have passed since its last captured
  request (`Bucket.last_visit_at`, reset on every capture in routes/catch_all.py)
* a request is deleted once `REQUEST_TTL_HOURS` have passed since it was
  received
* a bin keeps at most `MAX_REQUESTS_PER_BIN` requests -- enforced at capture
  time by `trim_bucket_to_cap`, not by the periodic sweep

Postgres rows are deleted first and their Mongo payloads second: a crash
between the two leaves orphaned Mongo documents that nothing references
(invisible, reclaimable later), whereas the reverse order would leave
bucket_requests rows whose payloads 404 in the inspector.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.orm import Session

from connection_manager import manager
from db.mongo import get_requests_collection
from models.bucket import Bucket
from models.bucket_request import BucketRequest
from models.database import SessionLocal

load_dotenv()

logger = logging.getLogger(__name__)

def _env_number(name: str, default: str, cast):
    """Read a numeric env var, naming it if it's unparseable.

    Without this the failure is a bare ValueError raised at import time,
    which stops the app from starting without saying which var is wrong.
    """
    raw = os.getenv(name, default).strip()
    try:
        return cast(raw)
    except ValueError:
        raise ValueError(f"{name} must be a number, got {raw!r}") from None


SWEEP_INTERVAL_SECONDS = _env_number("SWEEP_INTERVAL_SECONDS", "300", float)
# Fractional hours are allowed so the TTLs can be turned down to minutes for
# a manual test (0.05 == 3 minutes).
BIN_TTL_HOURS = _env_number("BIN_TTL_HOURS", "48", float)
REQUEST_TTL_HOURS = _env_number("REQUEST_TTL_HOURS", "48", float)
MAX_REQUESTS_PER_BIN = _env_number("MAX_REQUESTS_PER_BIN", "200", int)


def run_sweep() -> list[tuple[str, dict]]:
    """
    One age-based cleanup pass. Blocking -- call it via asyncio.to_thread.

    Returns the (public_id, message) pairs the caller should broadcast.
    Broadcasting can't happen here: this runs on a worker thread, while the
    WebSockets live on the event loop.
    """
    db: Session = SessionLocal()
    mongo_ids: list[str] = []
    events: list[tuple[str, dict]] = []
    try:
        # One `now` for both passes so they agree on the boundary. Aware
        # datetime: both columns are DateTime(timezone=True), and comparing
        # one against a naive datetime raises.
        now = datetime.now(timezone.utc)
        bin_mongo_ids, bin_events = _delete_expired_bins(db, now)
        # Runs after the bin pass in the same transaction, so requests already
        # removed with their bin aren't reported a second time.
        req_mongo_ids, req_events = _delete_expired_requests(db, now)
        mongo_ids = bin_mongo_ids + req_mongo_ids
        events = bin_events + req_events
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    delete_mongo_payloads(mongo_ids)
    return events


def _delete_expired_bins(db: Session, now: datetime) -> tuple[list[str], list[tuple[str, dict]]]:
    """Delete bins idle past the TTL and every request inside them."""
    cutoff = now - timedelta(hours=BIN_TTL_HOURS)

    # public_id comes along because it, not bucket_id, is what the
    # ConnectionManager keys sockets by -- and it has to be read before the
    # row is deleted.
    expired = (
        db.query(Bucket.bucket_id, Bucket.public_id)
        .filter(Bucket.last_visit_at < cutoff)
        .all()
    )
    if not expired:
        return [], []
    expired_bin_ids = [row.bucket_id for row in expired]

    # Read the mongo_ids out before the delete -- afterwards there is no way
    # back from a bucket to its payloads.
    mongo_ids = [
        row.mongo_id
        for row in db.query(BucketRequest.mongo_id)
        .filter(BucketRequest.bucket_id.in_(expired_bin_ids))
        .all()
    ]

    # Children first: bucket_requests.bucket_id is a plain FK with no
    # ON DELETE rule, so deleting the buckets first raises ForeignKeyViolation.
    # synchronize_session=False -- nothing in this Session's identity map
    # needs to reflect the delete, it closes immediately after.
    db.query(BucketRequest).filter(
        BucketRequest.bucket_id.in_(expired_bin_ids)
    ).delete(synchronize_session=False)
    db.query(Bucket).filter(
        Bucket.bucket_id.in_(expired_bin_ids)
    ).delete(synchronize_session=False)

    logger.info(
        "Expired %d bin(s) idle for %gh, holding %d request(s)",
        len(expired_bin_ids),
        BIN_TTL_HOURS,
        len(mongo_ids),
    )
    events = [(str(row.public_id), {"type": "bin_expired"}) for row in expired]
    return mongo_ids, events


def _delete_expired_requests(db: Session, now: datetime) -> tuple[list[str], list[tuple[str, dict]]]:
    """Delete individual requests past the TTL, leaving their bins alone."""
    cutoff = now - timedelta(hours=REQUEST_TTL_HOURS)

    rows = (
        db.query(BucketRequest.id, BucketRequest.mongo_id, Bucket.public_id)
        .join(Bucket, Bucket.bucket_id == BucketRequest.bucket_id)
        .filter(BucketRequest.received_at < cutoff)
        .all()
    )
    if not rows:
        return [], []

    db.query(BucketRequest).filter(
        BucketRequest.id.in_([row.id for row in rows])
    ).delete(synchronize_session=False)

    # One message per bin rather than per request: a bin that ages out 50
    # requests at once should cost the viewer one update, not 50.
    by_bin: dict[str, list[int]] = {}
    for row in rows:
        by_bin.setdefault(str(row.public_id), []).append(row.id)
    events = [
        (public_id, {"type": "requests_removed", "ids": ids})
        for public_id, ids in by_bin.items()
    ]

    logger.info("Expired %d request(s) older than %gh", len(rows), REQUEST_TTL_HOURS)
    return [row.mongo_id for row in rows], events


# Keeps the newest MAX_REQUESTS_PER_BIN rows and deletes the rest in one
# statement, returning just the mongo_ids that need purging. RETURNING is what
# makes this a single round trip: a SELECT-then-DELETE pair would need two, on
# a path that runs for every captured request. `id DESC` breaks ties on
# received_at, which has only microsecond resolution.
_TRIM_BUCKET_SQL = text(
    """
    DELETE FROM bucket_requests
    WHERE id IN (
        SELECT id
        FROM bucket_requests
        WHERE bucket_id = :bucket_id
        ORDER BY received_at DESC, id DESC
        OFFSET :cap
    )
    RETURNING id, mongo_id
    """
)


def trim_bucket_to_cap(db: Session, bucket_id: int) -> list[int]:
    """
    Drop a bucket's oldest requests once it holds more than the cap.

    Called from the capture path after the new request is committed, so the
    cap is exact rather than "exact as of the last sweep". Normally deletes
    nothing (under the cap) or exactly one row (steady state at the cap).

    Commits its own delete before touching Mongo, matching the sweep's
    Postgres-first ordering. Returns the deleted request ids for the caller
    to broadcast.
    """
    rows = db.execute(
        _TRIM_BUCKET_SQL, {"bucket_id": bucket_id, "cap": MAX_REQUESTS_PER_BIN}
    ).all()
    if not rows:
        return []

    db.commit()
    logger.info(
        "Trimmed %d request(s) from bucket %d over the %d cap",
        len(rows),
        bucket_id,
        MAX_REQUESTS_PER_BIN,
    )
    delete_mongo_payloads([row.mongo_id for row in rows])
    return [row.id for row in rows]


def delete_mongo_payloads(mongo_ids: list[str]) -> None:
    """Delete captured payloads by their stringified ObjectIds."""
    if not mongo_ids:
        return

    # BucketRequest.mongo_id is a String column. Handing those strings
    # straight to delete_many matches zero documents and still reports
    # success -- the quietest way for this whole feature to do nothing.
    object_ids = []
    for mongo_id in mongo_ids:
        try:
            object_ids.append(ObjectId(mongo_id))
        except (InvalidId, TypeError):
            logger.warning("Skipping unparseable mongo_id %r", mongo_id)
    if not object_ids:
        return

    result = get_requests_collection().delete_many({"_id": {"$in": object_ids}})
    if result.deleted_count != len(object_ids):
        logger.warning(
            "Deleted %d of %d Mongo payload(s); the rest were already gone",
            result.deleted_count,
            len(object_ids),
        )


async def sweep_loop() -> None:
    """Run run_sweep() forever on a fixed interval. Started from main.py."""
    logger.info(
        "Retention sweep every %gs: bins idle %gh, requests older than %gh, "
        "max %d request(s) per bin",
        SWEEP_INTERVAL_SECONDS,
        BIN_TTL_HOURS,
        REQUEST_TTL_HOURS,
        MAX_REQUESTS_PER_BIN,
    )
    while True:
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
        try:
            # psycopg2 and pymongo both block; running the sweep on the event
            # loop would stall every in-flight request and WS broadcast for
            # its duration.
            events = await asyncio.to_thread(run_sweep)
            for public_id, message in events:
                await manager.broadcast(public_id, message)
        except asyncio.CancelledError:
            raise
        except Exception:
            # Must stay inside the loop: an exception that escapes kills the
            # task silently and cleanup never runs again for the process's life.
            logger.exception("Cleanup sweep failed; retrying next interval")
