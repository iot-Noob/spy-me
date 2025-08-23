from pydantic import BaseModel
from typing import List,Dict,Optional
class SDPRegisterRequest(BaseModel):
    title:Optional[str]=None
    sdp: str
    ice:List

class HeartbeatData(BaseModel):
    status: str  # "connected" or "disconnected"
    
class SDPAnswerRequest(BaseModel):
    title:Optional[str]=None
    answer_sdp: str
    ice:List


 