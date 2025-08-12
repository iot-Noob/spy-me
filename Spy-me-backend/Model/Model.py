from pydantic import BaseModel
from typing import List,Dict
class SDPRegisterRequest(BaseModel):
    client_id: str
    sdp: str
 

class HeartbeatData(BaseModel):
    status: str  # "connected" or "disconnected"
    
class SDPAnswerRequest(BaseModel):
    client_id: str
    answer_sdp: str
 


class SDPUpdateRequest(BaseModel):
    client_id: str
    sdp: str

    
class SDPAnswerUpdateRequest(BaseModel):
    client_id: str
    answer_sdp: str