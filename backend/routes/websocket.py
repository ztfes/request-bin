import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from connection_manager import manager
from models.bucket import Bucket
from models.database import get_db

router = APIRouter()


@router.websocket("/ws/{bucket_id}")
async def bucket_updates(websocket: WebSocket, bucket_id: str, db: Session = Depends(get_db)):
    try:
        public_id = uuid.UUID(bucket_id)
    except ValueError:
        await websocket.accept()
        await websocket.close(code=4404, reason="Bucket not found")
        return

    bucket = db.query(Bucket).filter(Bucket.public_id == public_id).first()
    if bucket is None:
        await websocket.accept()
        await websocket.close(code=4404, reason="Bucket not found")
        return

    await manager.connect(bucket_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(bucket_id, websocket)
