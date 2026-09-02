import base64
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from connection_manager import manager
from db.mongo import get_requests_collection
from models.bucket import Bucket
from models.bucket_request import BucketRequest
from models.database import get_db
from models.request_document import RequestDocument

router = APIRouter()


@router.api_route(
    "/{public_id}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def capture(
    public_id: uuid.UUID,
    path: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Capture an inbound request against a bucket, persist it, and broadcast it."""
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()
    if bucket is None:
        raise HTTPException(status_code=404, detail="Bucket not found")

    raw_body = await request.body()
    headers = dict(request.headers)
    decoded_body = raw_body.decode("utf-8", errors="replace")
    full_path = "/" + path

    request_document = RequestDocument(
        bucket_id=bucket.bucket_id,
        method=request.method,
        path=full_path,
        headers=headers,
        query_params=dict(request.query_params),
        remote_addr=request.client.host if request.client else None,
        raw_request=base64.b64encode(raw_body).decode("ascii"),
    )
    mongo_result = get_requests_collection().insert_one(request_document.model_dump())

    bucket_request = BucketRequest(
        bucket_id=bucket.bucket_id,
        method=request.method,
        path=full_path,
        headers=headers,
        body=decoded_body,
        mongo_id=str(mongo_result.inserted_id),
    )
    db.add(bucket_request)
    bucket.last_visit_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(bucket_request)

    await manager.broadcast(
        str(public_id),
        {
            "id": bucket_request.id,
            "method": bucket_request.method,
            "path": bucket_request.path,
            "headers": bucket_request.headers,
            "body": bucket_request.body,
            "received_at": bucket_request.received_at.isoformat(),
            "mongo_id": bucket_request.mongo_id,
        },
    )

    return {"status": "captured", "bucket": str(public_id)}
