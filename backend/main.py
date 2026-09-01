from fastapi import FastAPI

from routes import bins, catch_all

app = FastAPI(title="Request Bin")

# bins must come first -- catch_all's /{full_path:path} would otherwise swallow it.
app.include_router(bins.router)
app.include_router(catch_all.router)
