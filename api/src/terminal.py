import asyncio
import logging
from logging import Logger
from operator import attrgetter
from typing import Any, Awaitable, Callable, List, Optional
from uuid import uuid4

import aioredis
import pydantic
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from src.redisapi import redis_pool
from src.utils import try_parse_int

logger: Logger = logging.getLogger(__name__)
router = APIRouter()

EXPIRE_TTL = 86400 * 2  # seconds


class ResponseId(BaseModel):
    id: str


class FileRequestItem(BaseModel):
    model_id: str
    file_path: str
    request_path: str


class HistoryItem(BaseModel):
    idx: Optional[int]
    command: str
    cwd: str


class ContainerInfo(BaseModel):
    id: str
    name: str
    model_id: str
    image: str
    launched: str
    docker_host: str


@router.get("/ping")
async def ping_redis(redis: aioredis.Redis = Depends(redis_pool)) -> str:
    logger.debug("ping")
    return Response(content=str(await redis.ping()), media_type="plain/text")


async def gather_non_nil(xs: List[Awaitable[Any]]) -> List[Any]:
    """
    Run coroutines concurrently only return non-nil results
    """
    res: List[Any] = []
    for co in asyncio.as_completed(xs):
        r = await co
        if r:
            res.append(r)
    return res


async def gather_list(redis: aioredis.Redis, prefix: str, fetcher: Callable[[str, int], Awaitable[Any]]) -> List[Any]:
    resp = await redis.get(f"{prefix}:idx")
    if resp is None:
        return []
    count = try_parse_int(resp)
    return await gather_non_nil([fetcher(prefix, i) for i in range(count)])


@router.get("/container/history/{model_id}")
async def container_history(model_id: str, redis: aioredis.Redis = Depends(redis_pool)) -> List[HistoryItem]:
    key = f"terminal:history:{model_id}"

    async def fetcher(prefix: str, i: int) -> Optional[HistoryItem]:
        hist = await redis.hmget(f"{prefix}:{i}", "command", "cwd")
        if hist[0]:
            command, cwd = hist
            return HistoryItem(idx=i, command=command, cwd=cwd)
        return None

    res = await gather_list(redis, key, fetcher)
    return sorted(res, key=attrgetter("idx"))


@router.delete("/container/history/{model_id}/{idx}")
async def delete_list_item(model_id: str, idx: str, redis: aioredis.Redis = Depends(redis_pool)) -> str:
    key = f"terminal:history:{model_id}"
    item_key = f"{key}:{idx}"
    await redis.delete(item_key)
    return "ok"


@router.get("/container/info/{cid}")
async def container_info(cid: str, redis: aioredis.Redis = Depends(redis_pool)) -> ContainerInfo:
    """
    Rebuild an object from redis
    """
    key = f"terminal:container:{cid}"
    fields = [
        "id",
        "name",
        "model_id",
        "image",
        "launched",
        "docker_host",
    ]
    # meta
    cid, name, model_id, image, launched, docker_host = await redis.hmget(key, *fields)
    return ContainerInfo(
        id=model_id,
        name=name,
        model_id=model_id,
        image=image,
        launched=launched,
        docker_host=docker_host,
    )


@router.delete("/container/info/{cid}")
async def expire_container_info(cid: str, redis: aioredis.Redis = Depends(redis_pool)) -> int:
    """
    Expire all keys related to an ID
    """
    key = f"terminal:container:{cid}"
    cur = 0
    count = 0
    while res := await redis.scan(cur, f"{key}*", 100):
        cursor, keys = res
        await asyncio.gather(*[redis.expire(k, EXPIRE_TTL) for k in keys])
        cur = try_parse_int(cursor)
        count += len(keys)
        if cur == 0:
            break

    return count


@router.post("/file")
async def put_request_info(item: FileRequestItem, redis: aioredis.Redis = Depends(redis_pool)) -> ResponseId:
    TTL = 1800  # seconds
    reqid = str(uuid4().hex)
    key = f"terminal:file:{reqid}"

    await redis.hmset_dict(key, item.dict())
    await redis.expire(key, TTL)

    return ResponseId(id=reqid)


@router.get("/file/{reqid}")
async def get_file_request_info(reqid: str, redis: aioredis.Redis = Depends(redis_pool)) -> FileRequestItem:
    key = f"terminal:file:{reqid}"
    fields = ["model_id", "file_path", "request_path"]
    model_id, file_path, request_path = await redis.hmget(key, *fields)
    try:
        return FileRequestItem(model_id=model_id, file_path=file_path, request_path=request_path)
    except pydantic.error_wrappers.ValidationError as pye:
        raise HTTPException(status_code=500, detail=str(pye))
