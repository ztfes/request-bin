from fastapi import FastAPI

from routes import catch_all

app = FastAPI(title="Request Bin")

app.include_router(catch_all.router)
