from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from connection_manager import manager

router = APIRouter()


@router.websocket("/ws/{bucket_id}")
async def bucket_updates(websocket: WebSocket, bucket_id: str):
    await manager.connect(bucket_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(bucket_id, websocket)
