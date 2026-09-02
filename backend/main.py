from fastapi import FastAPI

from routes import catch_all, websocket

app = FastAPI(title="Request Bin")

app.include_router(websocket.router)
app.include_router(catch_all.router)
