"""
KBC Haven Voice Engine Package
"""

from .elevenlabs_service import (
    BelgianVoicePersona,
    BELGIAN_PERSONAS,
    SynthesisResult,
    ElevenLabsVoiceService,
    HACKATHON_SCENARIOS,
    get_scenario_script,
    list_available_scenarios,
    voice_service,
)

__all__ = [
    "BelgianVoicePersona",
    "BELGIAN_PERSONAS",
    "SynthesisResult",
    "ElevenLabsVoiceService",
    "HACKATHON_SCENARIOS",
    "get_scenario_script",
    "list_available_scenarios",
    "voice_service",
]
