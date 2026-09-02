import uuid
from datetime import datetime

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


# Is the route handler for POST /buckets
@router.post("/buckets", response_model=BucketOut, status_code=status.HTTP_201_CREATED)
def create_bucket(db: Session = Depends(get_db)) -> Bucket:
    bucket = Bucket()
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket

# Is the route handler for GET /buckets/{public_id}
@router.get("/buckets/{public_id}", response_model=list[BucketRequestOut])
def list_bucket_requests(public_id: uuid.UUID, db: Session = Depends(get_db)) -> list[BucketRequest]:
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()
    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bucket not found")
    return (
        db.query(BucketRequest)
        .filter(BucketRequest.bucket_id == bucket.bucket_id)
        .order_by(BucketRequest.received_at.asc())
        .all()
    )

# Is the route handler for GET /buckets/{public_id}/requests/{request_id}
@router.get("/buckets/{public_id}/requests/{request_id}", response_model=BucketRequestOut)
def get_bucket_request(
    public_id: uuid.UUID, request_id: int, db: Session = Depends(get_db)
) -> BucketRequest:
    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()
    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Bucket not found")

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

@router.api_route(
    "/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def capture(full_path: str, request: Request):
    """Catch any incoming request and echo its parsed contents.

    No persistence yet -- this exists so incoming webhooks (e.g. tunnelled
    through ngrok) can be inspected while the capture/storage path is built.
    """
    raw_body = await request.body()
    captured = {
        "method": request.method,
        "path": "/" + full_path,
        "query": dict(request.query_params),
        "headers": dict(request.headers),
        "body": raw_body.decode("utf-8", errors="replace"),
    }
    print(captured)
    return Response(status_code=200)
