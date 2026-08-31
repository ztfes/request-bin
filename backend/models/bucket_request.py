from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from models.database import Base


class BucketRequest(Base):
    __tablename__ = "bucket_requests"

    id = Column(Integer, primary_key=True)
    bucket_id = Column(Integer, ForeignKey("buckets.bucket_id"), nullable=False)
    method = Column(String, nullable=False)
    path = Column(String, nullable=False)
    headers = Column(JSONB, nullable=True)
    body = Column(String, nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    mongo_id = Column(String, nullable=False)