import logging
from logging import Logger

from typing import List, Optional

import aioredis
from fastapi import APIRouter, Depends, Response, HTTPException, status
from pydantic import BaseModel

from src.redisapi import redis_pool
from src.dockerhub import get_image_tags


logger: Logger = logging.getLogger(__name__)
router = APIRouter()

BASE_IMAGES_KEY = "dojo-ui:base_images"


class BaseImageItem(BaseModel):
    sort_order: Optional[int]
    display_name: str
    image: str

    def hash(self):
        return f"{self.image}_{self.display_name}"


@router.get("/ping")
async def ping_redis(redis: aioredis.Redis = Depends(redis_pool)) -> str:
    logger.debug("ping")
    return Response(content=str(await redis.ping()), media_type="plain/text")


@router.get("/base_images", deprecated=True)
async def get_base_images_deprecated(redis: aioredis.Redis = Depends(redis_pool)) -> List[BaseImageItem]:
    return get_image_tags(repo="dojo-publish")


@router.get("/base_images/{repo}")
async def get_base_images(repo: str, redis: aioredis.Redis = Depends(redis_pool)) -> List[BaseImageItem]:
    try:
        return get_image_tags(repo)
    except Exception:
        logger.exception(f"Failed to retrieve images from {repo}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to retrieve images from {repo}"
        )
