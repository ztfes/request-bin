import uuid
import secrets
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Integer, String, DateTime, func
from models.database import Base


class Bucket(Base):
    __tablename__ = "buckets"

    bucket_id = Column(Integer, primary_key=True)
    public_id = Column(UUID(as_uuid=True), unique=True, default=uuid.uuid4, nullable=False)
    owner_token = Column(String, unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_visit_at = Column(DateTime(timezone=True), server_default=func.now())