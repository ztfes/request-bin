import uuid
from datetime import datetime

from fastapi import Header
from fastapi import  APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from db.mongo import get_requests_collection
from models.bucket import Bucket
from models.bucket_request import BucketRequest
from models.database import get_db
router = APIRouter()


class BucketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bucket_id: int
    public_id: uuid.UUID
    owner_token: str
    created_at: datetime
    last_visit_at: datetime

class BucketRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bucket_id: int
    method: str
    path: str
    headers: dict | None
    body: str | None
    received_at: datetime
    mongo_id: str

class BucketRequestListOut(BaseModel):
    total: int
    requests: list[BucketRequestOut]

# Is the route handler for POST /buckets
@router.post("/buckets", response_model=BucketOut, status_code=status.HTTP_201_CREATED)
def create_bucket(db: Session = Depends(get_db)) -> Bucket:
    bucket = Bucket()
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket

# Is the route handler for GET /buckets/{public_id}
@router.get("/buckets/{public_id}", response_model=BucketRequestListOut)
def list_bucket_requests(
    public_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_token: str = Header(...),) -> BucketRequestListOut:
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()
    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bucket not found")
    
    if bucket.owner_token != owner_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this bucket")
    
    requests = (
        db.query(BucketRequest)
        .filter(BucketRequest.bucket_id == bucket.bucket_id)
        .order_by(BucketRequest.received_at.asc())
        .all()
    )
    return BucketRequestListOut(total=len(requests), requests=requests)

# Is the route handler for GET /buckets/{public_id}/requests/{request_id}
@router.get("/buckets/{public_id}/requests/{request_id}", response_model=BucketRequestOut)
def get_bucket_request(
    public_id: uuid.UUID, 
    request_id: int, 
    db: Session = Depends(get_db),
    owner_token: str = Header(...)
) -> BucketRequest:
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()

    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bucket not found")

    if bucket.owner_token != owner_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this bucket")
    
    bucket_request = (
        db.query(BucketRequest)
        .filter(
            BucketRequest.id == request_id,
            BucketRequest.bucket_id == bucket.bucket_id,
        )
        .first()
    )
    if bucket_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    return bucket_request


# Is the route handler for DELETE /buckets/{public_id}
@router.delete("/buckets/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bucket(
    public_id: uuid.UUID,
    db: Session = Depends(get_db),
    owner_token: str = Header(...),
) -> Response:
    """Delete a bucket along with every request captured into it."""
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()

    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bucket not found")

    if bucket.owner_token != owner_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this bucket")

    # Mongo first, then Postgres. If the second half fails the caller can just
    # retry: delete_many is a no-op the second time round and the rows are still
    # there to remove. Doing it the other way would leave documents in
    # captured_requests with no bucket row left to find them by.
    get_requests_collection().delete_many({"bucket_id": bucket.bucket_id})

    db.query(BucketRequest).filter(
        BucketRequest.bucket_id == bucket.bucket_id
    ).delete(synchronize_session=False)
    db.delete(bucket)
    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
