import logging

import uvicorn
from fastapi import FastAPI

from src import terminal, dojo, healthcheck, indicators, models, ui, runs
from src.settings import settings

logger = logging.getLogger(__name__)

api = FastAPI(docs_url="/")
api.include_router(healthcheck.router, tags=["Health Check"])
api.include_router(models.router, tags=["Models"])
api.include_router(dojo.router, tags=["Dojo"])
api.include_router(runs.router, tags=["Runs"])
api.include_router(indicators.router, tags=["Indicators"])
api.include_router(terminal.router, prefix="/terminal", tags=["Terminal"])
api.include_router(ui.router, prefix="/ui", tags=["ui"])


def print_debug_routes() -> None:
    max_len = max(len(route.path) for route in api.routes)
    routes = sorted(
        [
            (method, route.path, route.name)
            for route in api.routes
            for method in route.methods
        ],
        key=lambda x: (x[1], x[0]),
    )
    route_table = "\n".join(
        f"{method:7} {path:{max_len}} {name}" for method, path, name in routes
    )
    logger.debug(f"Route Table:\n{route_table}")


@api.on_event("startup")
async def startup_event() -> None:
    print_debug_routes()


if __name__ == "__main__":
    print_debug_routes()
    if settings.UVICORN_RELOAD:
        uvicorn.run(
            f"{__name__}:api",
            host="0.0.0.0",
            port=settings.BIND_PORT,
            reload=True,
            log_config="logging.color.yaml",
        )
    else:
        uvicorn.run(
            api, host="0.0.0.0", port=settings.BIND_PORT, log_config="logging.yaml"
        )
