from asyncio import wait
from tkinter import NO
from token import OP
from fastapi import APIRouter, HTTPException,Query,Path,WebSocket,WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import  Dict,Optional
import time
from Model.Model import HeartbeatData,SDPRegisterRequest,SDPAnswerRequest
from uuid import uuid4
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    print("API Start 007")
    yield
    print("API End 007")

route = APIRouter(lifespan=lifespan)
spy_clients: Dict[str, Dict] = {}
ws_clients:Dict[str,WebSocket]={}
crt:Dict={}

@route.post("/register_sdp", tags=["SDP-manager"])
async def register_sdp(data: SDPRegisterRequest):
    try:
        rid=str(uuid4())
        spy_clients[rid] = {
            "title":data.title,
            "sdp": data.sdp,
            "status": "disconnected",
            "last_heartbeat": time.time(),
            "ice":data.ice
        }
        return JSONResponse(content={"message": "SDP and ICE candidates registered successfully", "client_id": rid})
    except HTTPException:
        # Re-raise HTTP exceptions to be handled properly by FastAPI
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred while registering SDP: {e}")
    

# @route.post("/register_answer", tags=["SDP-manager"])
# async def register_answer(data: SDPAnswerRequest):
#     client = spy_clients.get(data.client_id)
#     if not client:
#         raise HTTPException(status_code=404, detail="Client not found. Register offer first.")
    
#     client["answer_sdp"] = data.answer_sdp
#     client["answer_ice"]=data.ice
#     client["last_heartbeat"] = time.time()
#     client["status"] = "disconnected"

#     return JSONResponse(content={"message": "Answer SDP registered successfully", "client_id": data.client_id})

@route.get("/get_clients", tags=["SDP-manager"])
async def get_clients(id: Optional[str] = Query(None)):
    if id:
        client = spy_clients.get(id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return {id: client}
    else:
        # Return only list of client IDs
        return {"client_ids": list(spy_clients.keys())}

# @route.put("/update_sdp", tags=["SDP-manager"])
# async def update_sdp(data: SDPUpdateRequest):
#     client = spy_clients.get(data.client_id)
#     if not client:
#         raise HTTPException(status_code=404, detail="Client not found")
#     client["ice"]=data.ice
#     client["sdp"] = data.sdp
#     client["last_heartbeat"] = time.time()
#     # client["status"] = "disconnected"

#     return {"message": "SDP offer updated successfully", "client_id": data.client_id}

# @route.put("/update_answer", tags=["SDP-manager"])
# async def update_answer(data: SDPAnswerUpdateRequest):
#     client = spy_clients.get(data.client_id)
#     if not client:
#         raise HTTPException(status_code=404, detail="Client not found")
#     client["answer_ice"]=data.ice
#     client["answer_sdp"] = data.answer_sdp
#     client["last_heartbeat"] = time.time()
#     # client["status"] = "disconnected"

#     return {"message": "SDP answer updated successfully", "client_id": data.client_id}

@route.delete("/delete_client/{client_id}", tags=["SDP-manager"])
async def delete_client(client_id: str = Path(..., description="ID of the client to delete")):
    if client_id not in spy_clients:
        raise HTTPException(status_code=404, detail="Client not found")

    del spy_clients[client_id]
    return {"message": f"Client '{client_id}' deleted successfully"}

from fastapi import Body

# @route.post("/heartbeat", tags=["SDP-manager"])
# async def heartbeat(
#     client_id: str = Body(..., embed=True),
#     status: str = Body(..., embed=True)  # could be "connected", "disconnected", etc.
# ):
#     client = spy_clients.get(client_id)
#     if not client:
#         raise HTTPException(status_code=404, detail="Client not found")

#     client["last_heartbeat"] = time.time()
#     client["status"] = status
#     return {"message": f"Heartbeat updated for {client_id}", "status": status}

@route.websocket("/manager/{id}")
async def websock_manager(id: str, websock: WebSocket):
    await websock.accept()

    if id not in spy_clients:
        await websock.send_text("Sock client not exist")
        await websock.close()
        return
    ws_clients[id]=websock
    try:
        while True:
            data = await websock.receive_json()
            msg_type = data.get("type")

            if msg_type == "offer":
                try:
                    offer = SDPRegisterRequest(**data)
                    spy_clients[id]["sdp"] = offer.sdp
                    spy_clients[id]["ice"] = offer.ice
                    spy_clients[id]["status"] = "offer_registered"
                    await websock.send_json({"sucess":f"Send offer of id {id}"})
                    print(f"Offer data: {data}")
                except Exception as e:
                    await websock.send_json({"error":f"validation fail due to\n\n {e}"})

            elif msg_type == "answer":
                try:
                    answer = SDPAnswerRequest(**data)
                    spy_clients[id]["answer_sdp"] = answer.answer_sdp
                    spy_clients[id]["answer_ice"] = answer.ice
                    spy_clients[id]["status"] = "answer_registered"
                    await websock.send_text(f"Answer registered for {id}")
                    print(f"Answer data: {data}")
                except Exception as e:
                    await websock.send_json({"error":f"validation fail due to\n\n {e}"})
            elif msg_type == "sofr":
                client_ws = ws_clients.get(id)
                if client_ws:
                    temp={
                        "sdp":spy_clients[id]["sdp"],
                        "ice":spy_clients[id]["ice"],
                        "status":spy_clients[id]["status"],
                    }
                    await client_ws.send_json(temp)
            elif msg_type == "sasr":
                client_ws = ws_clients.get(id)
                if client_ws:
                    temp={
                        "answer_sdp":spy_clients[id]["answer_sdp"],
                        "answer_ice":spy_clients[id]["answer_ice"],
                        "status":spy_clients[id]["status"],
                    }
                    await client_ws.send_json(temp)
                else:
                    print(f"No WebSocket connection for client {id}")
                    
            elif msg_type == "hbeat":
                client_ws = ws_clients.get(id)
                if client_ws:
                    spy_clients[id]["heartbeat"]=time.time()
                    await client_ws.send_json({"status": "heartbeat_received"})
                else:
                    print(f"No WebSocket connection for client {id}")
    except WebSocketDisconnect:
        print(f"Client {id} disconnected")
        ws_clients.pop(id,"")
        
async def receive_message_from_client(client_id: str) ->dict:
    """
    Receive the next message from a client by its ID.
    Returns a dict or None if not connected.
    """
    client_ws = ws_clients.get(client_id)
    if client_ws:
        try:
            data = await client_ws.receive_json()
            return data
        except WebSocketDisconnect:
            print(f"Client {client_id} disconnected while receiving")
            ws_clients.pop(client_id, None)

    else:
        print(f"No active WebSocket for client {client_id}")
