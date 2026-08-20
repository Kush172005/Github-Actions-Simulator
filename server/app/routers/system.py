from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/system", tags=["system"])

class PingRequest(BaseModel):
    message: str    

class PingResponse(BaseModel):
    reply: str
    status: str = "healthy"

@router.post("/ping", response_model=PingResponse)    
async def ping(req:PingRequest) -> PingResponse:
    return PingResponse(reply=f"Shipstack AI says that {req.message} is ok!")    