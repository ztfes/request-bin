"""
Convention (not an enforced schema) for documents inserted into the
schemaless MongoDB `captured_requests` collection (see
backend/db/mongo.py:get_requests_collection). Mongo will happily accept
any shape, so this model exists purely to keep the four of us writing to
that collection aligned on one document shape rather than drifting into
mismatched fields.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class RequestDocument(BaseModel):
    bucket_id: int  # references Bucket.bucket_id, not Bucket.public_id
    method: str
    path: str
    headers: dict[str, str]
    query_params: dict[str, str] | None = None
    remote_addr: str | None = None
    received_at: datetime = Field(default_factory=datetime.utcnow)
    raw_request: str  # base64-encoded raw request bytes; do not decode as UTF-8
