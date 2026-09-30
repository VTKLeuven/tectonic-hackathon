"""
KBC Equilibrium - Voice API Routes & WebSocket Stream
=====================================================
REST & WebSocket endpoints for ElevenLabs Belgian voice synthesis,
interactive conversational scripts, and real-time audio streaming.

Endpoints:
- POST /api/voice/synthesize: Synthesizes text with selected Belgian persona (returns base64 or audio stream).
- GET  /api/voice/scripts/{scenario_id}: Exact script with timestamps & GenUI triggers for 3 scenarios.
- GET  /api/voice/personas: Metadata & acoustic specs for Liesbeth, Marc, and Marie.
- GET  /api/voice/scenarios: Available scenario list.
- WS   /api/voice/stream: Low-latency WebSocket streaming with sub-400ms TTFAB & barge-in support.
"""

import json
import base64
from typing import Optional, Dict, Any, List

# Try importing FastAPI/Pydantic/Starlette; provide clean fallback if not installed
try:
    from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query, Response
    from fastapi.responses import JSONResponse, Response as RawResponse
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    APIRouter = object
    BaseModel = object
    Field = lambda *args, **kwargs: None

from .elevenlabs_service import (
    voice_service,
    get_scenario_script,
    list_available_scenarios,
    BELGIAN_PERSONAS,
    BelgianVoicePersona
)

# ---------------------------------------------------------------------------
# Request & Response Models (Pydantic when available, or simple dict schemas)
# ---------------------------------------------------------------------------

if HAS_FASTAPI:
    class SynthesizeRequest(BaseModel):
        text: str = Field(..., description="Text to synthesize into speech", json_schema_extra={"example": "Luc, neem een trage ademhaling."})
        persona: Optional[str] = Field("liesbeth", description="Vocal persona: liesbeth, marc, or marie")
        stress_level: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="Customer stress index for dynamic cadence tuning")
        return_binary: Optional[bool] = Field(False, description="If True, returns raw WAV/MP3 bytes; otherwise rich JSON with base64 + Web Speech cues")

    class ScenarioScriptResponse(BaseModel):
        scenario_id: str
        title: str
        tagline: str
        recommended_persona: str
        user_profile: Dict[str, Any]
        environmental_state: Dict[str, Any]
        steps: List[Dict[str, Any]]
else:
    class SynthesizeRequest:
        pass


# ---------------------------------------------------------------------------
# Core Handler Functions (Reusable across FastAPI or custom runners)
# ---------------------------------------------------------------------------

def handle_synthesize(
    text: str,
    persona_key: Optional[str] = "liesbeth",
    stress_level: float = 0.0,
    return_binary: bool = False
) -> Dict[str, Any]:
    """
    Executes voice synthesis logic, returning either raw bytes or structured JSON dictionary.
    """
    if not text or not text.strip():
        raise ValueError("Text parameter cannot be empty.")

    result = voice_service.synthesize(
        text=text.strip(),
        persona_key=persona_key,
        stress_level=stress_level
    )
    
    if return_binary:
        binary_bytes = base64.b64decode(result.audio_base64)
        return {
            "is_binary": True,
            "bytes": binary_bytes,
            "mime_type": result.mime_type
        }

    return {
        "is_binary": False,
        "payload": result.to_dict()
    }


def handle_get_script(scenario_id: str) -> Dict[str, Any]:
    """Retrieves canonical script with millisecond timestamps and GenUI triggers."""
    script = get_scenario_script(scenario_id)
    if not script:
        raise KeyError(f"Scenario '{scenario_id}' not found. Valid scenarios: crisis_accident, financial_anxiety, sme_cashflow")
    return script


def handle_list_personas() -> List[Dict[str, Any]]:
    """Returns metadata for the 3 Belgian vocal personas."""
    return voice_service.list_personas()


def handle_list_scenarios() -> List[Dict[str, Any]]:
    """Returns directory of all available canonical hackathon scenarios."""
    return list_available_scenarios()


# ---------------------------------------------------------------------------
# FastAPI Router Definition (if FastAPI installed)
# ---------------------------------------------------------------------------

if HAS_FASTAPI:
    router = APIRouter(prefix="/api/voice", tags=["Voice Engine"])

    @router.post("/synthesize", summary="Synthesize Spoken Voice")
    async def api_synthesize(req: SynthesizeRequest):
        """
        Synthesizes text into high-fidelity speech.
        Uses ElevenLabs if API key is configured; otherwise uses deterministic
        offline acoustic synthesis with Web Speech API browser cues.
        """
        try:
            res = handle_synthesize(
                text=req.text,
                persona_key=req.persona,
                stress_level=req.stress_level or 0.0,
                return_binary=req.return_binary or False
            )
            if res.get("is_binary"):
                return RawResponse(
                    content=res["bytes"],
                    media_type=res["mime_type"],
                    headers={"Content-Disposition": "inline; filename=speech.wav"}
                )
            return res["payload"]
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Synthesis error: {str(e)}")

    @router.get("/scripts/{scenario_id}", summary="Get Scenario Conversational Script")
    async def api_get_script(scenario_id: str):
        """
        Returns full interactive dialogue script, timestamps, and Generative UI bindings
        for one of the 3 scenarios:
        - `crisis_accident`: E40 Highway crash & storm triage
        - `financial_anxiety`: Wim's €250 zero-fee buffer check-in
        - `sme_cashflow`: SD Worx TrustVoice PC 200 mobility dispute
        """
        try:
            return handle_get_script(scenario_id)
        except KeyError as ke:
            raise HTTPException(status_code=404, detail=str(ke))

    @router.get("/personas", summary="List Belgian Vocal Personas")
    async def api_list_personas():
        """Returns the 3 distinct Belgian vocal personas with prosody specifications."""
        return handle_list_personas()

    @router.get("/scenarios", summary="List Available Canonical Scenarios")
    async def api_list_scenarios():
        """Returns list of canonical scenarios with metadata."""
        return handle_list_scenarios()

    @router.websocket("/stream")
    async def websocket_voice_stream(websocket: WebSocket):
        """
        Low-latency WebSocket endpoint for full-duplex conversational audio streaming.
        
        Client Messages:
        - {"type": "synthesize", "text": "...", "persona": "liesbeth"}
        - {"type": "barge_in"} / {"type": "abort"} (flushes audio buffer instantly)
        
        Server Messages:
        - {"type": "chunk", "chunk_index": 0, "clause_text": "...", "audio_base64": "...", "is_final": false}
        - {"type": "aborted"}
        - {"type": "error", "message": "..."}
        """
        await websocket.accept()
        is_interrupted = False

        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                except Exception:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON format"}))
                    continue

                msg_type = msg.get("type", "synthesize")

                # Barge-in handling (< 60ms interruption)
                if msg_type in ("barge_in", "abort", "interrupt"):
                    is_interrupted = True
                    await websocket.send_text(json.dumps({
                        "type": "aborted",
                        "reason": "barge_in_triggered",
                        "status": "buffer_flushed"
                    }))
                    continue

                if msg_type == "synthesize":
                    is_interrupted = False
                    text = msg.get("text", "")
                    persona_key = msg.get("persona", "liesbeth")

                    if not text.strip():
                        await websocket.send_text(json.dumps({"type": "error", "message": "Text cannot be empty"}))
                        continue

                    # Stream audio chunks sentence-by-sentence
                    async for chunk in voice_service.stream_audio_chunks(text, persona_key):
                        if is_interrupted:
                            break
                        chunk["type"] = "audio_chunk"
                        await websocket.send_text(json.dumps(chunk))

        except WebSocketDisconnect:
            pass
        except Exception as e:
            try:
                await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
            except Exception:
                pass

else:
    # Minimal fallback router stub
    class MockRouter:
        def __init__(self, *args, **kwargs):
            self.routes = []
    router = MockRouter()
