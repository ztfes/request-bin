import uuid
from datetime import datetime

from fastapi import Header
from fastapi import  APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

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
