import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from models.bucket import Bucket
from models.database import get_db

router = APIRouter()


class BucketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bucket_id: int
    public_id: uuid.UUID
    created_at: datetime
    last_visit_at: datetime


# Must stay above the catch-all below -- FastAPI matches in declaration order,
# and /{full_path:path} would otherwise swallow POST /buckets.

# Is the route handler for POST /buckets
@router.post("/buckets", response_model=BucketOut, status_code=status.HTTP_201_CREATED)
def create_bucket(db: Session = Depends(get_db)) -> Bucket:
    bucket = Bucket()
    db.add(bucket)
    db.commit()
    db.refresh(bucket)
    return bucket


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
