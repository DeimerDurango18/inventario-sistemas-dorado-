import uvicorn

from app.core.config import settings


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1" if settings.debug else "0.0.0.0",
        port=settings.api_port,
        reload=settings.debug,
        proxy_headers=settings.trusted_proxy,
    )
