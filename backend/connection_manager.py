import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks active WebSocket connections grouped by bucket id."""

    def __init__(self) -> None:
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, bucket_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(bucket_id, set()).add(websocket)

    def disconnect(self, bucket_id: str, websocket: WebSocket) -> None:
        connections = self.active_connections.get(bucket_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            del self.active_connections[bucket_id]

    async def broadcast(self, bucket_id: str, message: dict) -> None:
        for websocket in set(self.active_connections.get(bucket_id, set())):
            try:
                await websocket.send_json(message)
            except Exception:
                # A socket that dropped without a clean disconnect raises
                # here. Without this, one stale connection aborts the whole
                # broadcast -- which now also means skipping the cap trim in
                # the capture path.
                logger.debug("Dropping unwritable socket for bucket %s", bucket_id)
                self.disconnect(bucket_id, websocket)


manager = ConnectionManager()
