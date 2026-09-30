"""
KBC Equilibrium - Main Backend Application Server
=================================================
FastAPI Application coordinating Voice AI (ElevenLabs) and Cognitive Reasoning (Vertex AI Gemini).
Includes full-duplex conversational agent endpoint, script inspection, and WebSocket streaming.
"""

import os
from typing import Optional, Dict, Any

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    FastAPI = object
    BaseModel = object
    Field = lambda *args, **kwargs: None

from voice.voice_routes import router as voice_router, handle_synthesize
from voice.elevenlabs_service import voice_service
from agent.cognitive_agent import cognitive_agent
from api.routes import router as api_router

if HAS_FASTAPI:
    class AgentChatRequest(BaseModel):
        message: str = Field(..., description="Customer message or transcribed voice input", json_schema_extra={"example": "Help, I had an accident on the E40!"})
        context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Session context (GPS, account balance, etc.)")
        session_id: Optional[str] = Field(None, description="Optional conversational session ID")
        synthesize_audio: Optional[bool] = Field(True, description="Whether to automatically synthesize spoken voice for response")
        preferred_persona: Optional[str] = Field(None, description="Optional persona override (liesbeth, marc, marie)")

    app = FastAPI(
        title="KBC Equilibrium & SD Worx TrustVoice API",
        version="1.0.0",
        description="Empathetic Conversational Voice & Cognitive Multimodal Banking Engine for 2.3M Belgian Users."
    )

    # Enable CORS for local hackathon frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount Engine & Voice Routes
    app.include_router(voice_router)
    app.include_router(api_router)

    @app.get("/api/health", summary="System Health & Integration Status")
    async def health_check():
        return {
            "status": "healthy",
            "service": "KBC Equilibrium Bancassurance & Voice Engine",
            "version": "2.4.0",
            "hydraulic_engine": {
                "valves_active": [
                    "Valve 1: Dynamic Emergency Float vs Deductible Calibration",
                    "Valve 2: Continuous Underwriting Schuldsaldo Amortization Sync",
                    "Valve 3: Belgian Art. 59 WIB 92 IPT / Lombard Advance",
                    "Valve 4: Mortgage Principal Moratorium (+€1,200/mo relief)",
                ],
                "scenarios_available": [
                    "sme-invoice-crunch-luc",
                    "flemish-epc-lucas-camille",
                    "burnout-medical-cliff-vincent",
                ],
            },
            "voice_and_cognitive": {
                "elevenlabs_live_configured": voice_service.is_api_configured(),
                "vertex_ai_live_configured": cognitive_agent.is_gcp_configured(),
                "offline_fallback_mode": True,
            },
            "security_guard": "Aikido Sentinel Clean (Anti-IDOR & PII Masking Active)",
        }

    @app.post("/api/agent/chat", summary="Conversational Agent Turn (Cognition + Voice Synthesis)")
    async def agent_chat(req: AgentChatRequest):
        """
        Processes a customer turn through the cognitive agent and optionally
        synthesizes the spoken response with the optimal Belgian voice persona.
        """
        try:
            # 1. Cognitive reasoning & GenUI binding
            cog_res = cognitive_agent.process_turn(
                user_message=req.message,
                context=req.context,
                session_id=req.session_id
            )
            response_dict = cog_res.to_dict()

            # 2. Synchronous voice synthesis if requested
            if req.synthesize_audio:
                chosen_persona = req.preferred_persona or cog_res.speech_cues.persona_id
                synth = voice_service.synthesize(
                    text=cog_res.spoken_response_nl,
                    persona_key=chosen_persona,
                    stress_level=cog_res.stress_index
                )
                response_dict["audio_synthesis"] = synth.to_dict()

            return response_dict
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

else:
    app = None
