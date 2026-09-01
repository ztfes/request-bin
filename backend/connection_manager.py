from fastapi import WebSocket


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
            await websocket.send_json(message)


manager = ConnectionManager()
