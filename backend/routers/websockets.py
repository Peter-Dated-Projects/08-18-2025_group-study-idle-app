"""
WebSocket endpoints for real-time communication.
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from websocket_manager import manager
import json

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = Query(...)):
    """
    WebSocket endpoint for real-time lobby events.
    
    Query Parameters:
    - user_id: The authenticated user's ID
    """
    if not user_id:
        await websocket.close(code=4001, reason="Missing user_id parameter")
        return
    
    # Check connection limit (200 max)
    if manager.get_connection_count() >= 200:
        await websocket.close(code=4003, reason="Server at maximum capacity")
        logger.warning(f"Connection rejected for {user_id} - server at capacity")
        return
    
    await manager.connect(websocket, user_id)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "system",
            "action": "connected",
            "message": "WebSocket connection established"
        }, user_id)
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                message_type = message.get("type")
                
                if message_type == "ping":
                    # Respond to ping with pong
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": message.get("timestamp"),
                        "connections": manager.get_connection_count()
                    }, user_id)
                
                elif message_type == "lobby_status":
                    # Client requesting lobby status update
                    lobby_code = message.get("lobby_code")
                    if lobby_code:
                        users = manager.get_lobby_users(lobby_code)
                        await manager.send_personal_message({
                            "type": "lobby",
                            "action": "status",
                            "lobby_code": lobby_code,
                            "users": users
                        }, user_id)
                
                else:
                    logger.warning(f"Unknown message type {message_type} from {user_id}")
                    
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {user_id}")
            except Exception as e:
                logger.error(f"Error processing message from {user_id}: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
    finally:
        manager.disconnect(user_id)
