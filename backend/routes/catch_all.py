from fastapi import APIRouter, Request, Response

router = APIRouter()


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
