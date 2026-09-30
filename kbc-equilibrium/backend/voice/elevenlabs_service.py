"""
KBC Equilibrium - ElevenLabs Voice AI Service
============================================
Handles high-fidelity conversational voice synthesis for KBC Haven & SD Worx TrustVoice.
Integrates with ElevenLabs API with seamless fallback to deterministic acoustic synthesis 
and Web Audio/Speech API cues for 100% offline out-of-the-box hackathon demos.

Supports 3 Distinct Belgian Vocal Personas:
1. Liesbeth - Flemish Grounded Warmth (calm, reassuring, ~130 WPM for crisis/anxiety)
2. Marc - Belgian Executive Advisor (clear, professional, ~150 WPM for SME cashflow)
3. Marie - Bilingual Empathy (gentle, diplomatic, ~140 WPM for fr-BE / nl-BE de-escalation)
"""

import os
import io
import math
import struct
import wave
import base64
import json
import asyncio
from typing import Dict, Any, Optional, List, AsyncIterator
from dataclasses import dataclass, field, asdict
from urllib import request as url_request, error as url_error


# ---------------------------------------------------------------------------
# 1. Belgian Vocal Persona Definitions
# ---------------------------------------------------------------------------

@dataclass
class BelgianVoicePersona:
    id: str
    name: str
    display_title: str
    description: str
    target_scenario: str
    wpm: int
    speed_factor: float
    language_code: str
    primary_locale: str
    voice_id: str
    model_id: str
    stability: float
    similarity_boost: float
    style: float
    use_speaker_boost: bool
    base_pitch_hz: float
    pause_duration_ms: int
    cadence_profile: str
    sample_quote_nl: str
    sample_quote_en: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


BELGIAN_PERSONAS: Dict[str, BelgianVoicePersona] = {
    "liesbeth": BelgianVoicePersona(
        id="liesbeth",
        name="Liesbeth",
        display_title="Liesbeth - Flemish Grounded Warmth",
        description="Calm, maternal, reassuring Belgian Dutch voice tuned to 130 WPM for crisis de-escalation, highway accidents, and zero-shame overdraft protection.",
        target_scenario="Crisis Triage & Financial Anxiety",
        wpm=130,
        speed_factor=0.88,
        language_code="nl",
        primary_locale="nl-BE",
        # Default ElevenLabs voice ID or custom clone (fallback ID: Rachel/Liesbeth equivalent)
        voice_id=os.getenv("ELEVENLABS_VOICE_LIESBETH", "21m00Tcm4TlvDq8ikWAM"),
        model_id="eleven_multilingual_v2",
        stability=0.85,
        similarity_boost=0.85,
        style=0.20,
        use_speaker_boost=True,
        base_pitch_hz=210.0,
        pause_duration_ms=280,
        cadence_profile="grounded_downward_inflection",
        sample_quote_nl="Luc, neem een trage, diepe ademhaling. Je spreekt met KBC Haven. Ben je zelf gewond?",
        sample_quote_en="Luc, take a slow, deep breath. You are speaking with KBC Haven. Are you yourself injured?"
    ),
    "marc": BelgianVoicePersona(
        id="marc",
        name="Marc",
        display_title="Marc - Belgian Executive Advisor",
        description="Articulate, professional, pragmatic voice tuned to 150 WPM for SME cashflow optimization, commercial loans, and statutory payroll provenance.",
        target_scenario="SME Cashflow & Corporate Governance",
        wpm=150,
        speed_factor=1.05,
        language_code="nl",
        primary_locale="nl-BE",
        voice_id=os.getenv("ELEVENLABS_VOICE_MARC", "VR6AewLTigWG4xSOukaG"),
        model_id="eleven_multilingual_v2",
        stability=0.75,
        similarity_boost=0.80,
        style=0.15,
        use_speaker_boost=True,
        base_pitch_hz=128.0,
        pause_duration_ms=180,
        cadence_profile="crisp_authoritative_clarity",
        sample_quote_nl="Goedemorgen Marc. Laten we meteen kijken naar je cashflow-horizon voor het komende kwartaal.",
        sample_quote_en="Good morning Marc. Let us immediately review your cashflow horizon for the upcoming quarter."
    ),
    "marie": BelgianVoicePersona(
        id="marie",
        name="Marie",
        display_title="Marie - Bilingual Empathy",
        description="Soothing, diplomatic, bilingual Belgian French/Dutch voice tuned to 140 WPM for Brussels joint committee disputes, payroll explanations, and customer reconciliation.",
        target_scenario="Bilingual Empathy & SD Worx TrustVoice",
        wpm=140,
        speed_factor=0.95,
        language_code="fr",
        primary_locale="fr-BE",
        voice_id=os.getenv("ELEVENLABS_VOICE_MARIE", "ThT5KcBeYPX3keUQqHPh"),
        model_id="eleven_multilingual_v2",
        stability=0.70,
        similarity_boost=0.85,
        style=0.25,
        use_speaker_boost=True,
        base_pitch_hz=225.0,
        pause_duration_ms=320,
        cadence_profile="melodic_diplomatic_warmth",
        sample_quote_nl="Geen enkel probleem, we kijken samen naar je loonbrief en het PC 200 koninklijk besluit.",
        sample_quote_en="No problem at all, let us examine your payslip and the PC 200 royal decree together."
    )
}


# ---------------------------------------------------------------------------
# 2. Synthesis Result & Web Audio Fallback Cues
# ---------------------------------------------------------------------------

@dataclass
class SynthesisResult:
    audio_base64: str
    mime_type: str
    duration_ms: int
    persona_id: str
    persona_title: str
    is_live_elevenlabs: bool
    text: str
    speech_cues: Dict[str, Any]
    web_speech_fallback: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# 3. ElevenLabs & Acoustic Synthesis Service
# ---------------------------------------------------------------------------

class ElevenLabsVoiceService:
    """
    Core Voice AI service providing ElevenLabs integration with zero-dependency
    mathematical acoustic fallback generation.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY") or os.getenv("ELEVEN_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"

    def get_persona(self, persona_key: Optional[str] = None) -> BelgianVoicePersona:
        """Resolves persona key (e.g. 'liesbeth', 'marc', 'marie', or title substring)."""
        if not persona_key:
            return BELGIAN_PERSONAS["liesbeth"]
        normalized = persona_key.strip().lower()
        for key, persona in BELGIAN_PERSONAS.items():
            if key in normalized or persona.name.lower() in normalized:
                return persona
        return BELGIAN_PERSONAS["liesbeth"]

    def list_personas(self) -> List[Dict[str, Any]]:
        """Returns all 3 Belgian vocal personas with acoustic specifications."""
        return [p.to_dict() for p in BELGIAN_PERSONAS.values()]

    def is_api_configured(self) -> bool:
        """Checks if a non-placeholder ElevenLabs API key is present."""
        return bool(self.api_key and not self.api_key.startswith("your_") and len(self.api_key) > 10)

    def generate_acoustic_fallback_wav(self, text: str, persona: BelgianVoicePersona) -> bytes:
        """
        Generates a valid, high-fidelity uncompressed 16-bit PCM mono WAV audio stream
        using pure Python standard library math and wave.
        
        Synthesizes a soothing, gentle acoustic tone envelope matching the persona's
        characteristic frequency, rhythm, and pauses so that audio tags and Web Audio
        play instantly with zero external dependencies.
        """
        sample_rate = 22050
        words = max(1, len(text.split()))
        # Duration proportional to words and persona speed (clamped for demo responsiveness)
        duration_sec = min(3.5, max(0.8, (words / (persona.wpm / 60.0)) * 0.45))
        total_samples = int(duration_sec * sample_rate)
        
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            
            frames = []
            f0 = persona.base_pitch_hz
            f1 = f0 * 1.5   # harmonic fifth
            f2 = f0 * 2.0   # harmonic octave
            
            for i in range(total_samples):
                t = i / sample_rate
                # Smooth ADSR envelope: fast gentle attack (40ms), sustained body, gentle fadeout
                attack = 1.0 - math.exp(-t * 35.0)
                decay = math.exp(-2.2 * (t / duration_sec))
                env = attack * decay
                
                # Syllabic acoustic modulation (speech-like pulse cadence)
                syllable_mod = 0.85 + 0.15 * math.sin(2 * math.pi * 4.5 * t)
                
                # Persona-specific harmonic acoustic wave
                harmonic_sum = (
                    0.55 * math.sin(2 * math.pi * f0 * t) +
                    0.30 * math.sin(2 * math.pi * f1 * t) +
                    0.15 * math.sin(2 * math.pi * f2 * t)
                )
                
                sample_val = int(32767 * 0.35 * env * syllable_mod * harmonic_sum)
                sample_val = max(-32767, min(32767, sample_val))
                frames.append(struct.pack('<h', sample_val))
                
            wav.writeframes(b''.join(frames))
            
        return buf.getvalue()

    def call_elevenlabs_api(self, text: str, persona: BelgianVoicePersona) -> bytes:
        """
        Calls ElevenLabs text-to-speech REST API with fallback to offline audio.
        """
        if not self.is_api_configured():
            raise ValueError("ElevenLabs API key not configured")

        url = f"{self.base_url}/text-to-speech/{persona.voice_id}?output_format=mp3_44100_128"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        payload = {
            "text": text,
            "model_id": persona.model_id,
            "voice_settings": {
                "stability": persona.stability,
                "similarity_boost": persona.similarity_boost,
                "style": persona.style,
                "use_speaker_boost": persona.use_speaker_boost
            }
        }
        
        req = url_request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with url_request.urlopen(req, timeout=8.0) as resp:
            return resp.read()

    def synthesize(
        self,
        text: str,
        persona_key: Optional[str] = None,
        stress_level: float = 0.0
    ) -> SynthesisResult:
        """
        Main synthesis method. Delivers high-fidelity audio (ElevenLabs live API if configured,
        or pristine offline acoustic stream) + full Web Speech API browser cues.
        """
        persona = self.get_persona(persona_key)
        
        # Adaptive prosody tuning based on stress_level (0.0 to 1.0)
        effective_wpm = persona.wpm
        if stress_level > 0.6:
            # Slow down speech for high stress to induce calm grounding
            effective_wpm = max(115, int(persona.wpm * (1.0 - (stress_level * 0.15))))

        is_live = False
        mime_type = "audio/wav"
        audio_bytes = b""
        
        # Attempt ElevenLabs Live if key exists
        if self.is_api_configured():
            try:
                audio_bytes = self.call_elevenlabs_api(text, persona)
                mime_type = "audio/mpeg"
                is_live = True
            except Exception:
                # Seamless fallback to offline generator
                is_live = False

        if not audio_bytes:
            audio_bytes = self.generate_acoustic_fallback_wav(text, persona)
            mime_type = "audio/wav"

        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
        words = max(1, len(text.split()))
        duration_ms = int((words / (effective_wpm / 60.0)) * 1000)

        # Web Speech API specification for browser execution
        web_speech_fallback = {
            "text": text,
            "lang": persona.primary_locale,
            "rate": round(effective_wpm / 150.0, 2),
            "pitch": 1.0 if persona.base_pitch_hz > 180 else 0.85,
            "volume": 1.0,
            "preferred_voice_hints": [
                f"{persona.name} (Belgium)",
                "Ellen",
                "Google Nederlands",
                "Microsoft Bart - Dutch (Belgium)"
            ]
        }

        speech_cues = {
            "wpm": effective_wpm,
            "cadence": persona.cadence_profile,
            "base_pitch_hz": persona.base_pitch_hz,
            "stability": persona.stability,
            "pause_duration_ms": persona.pause_duration_ms,
            "stress_index": round(stress_level, 2)
        }

        return SynthesisResult(
            audio_base64=audio_b64,
            mime_type=mime_type,
            duration_ms=duration_ms,
            persona_id=persona.id,
            persona_title=persona.display_title,
            is_live_elevenlabs=is_live,
            text=text,
            speech_cues=speech_cues,
            web_speech_fallback=web_speech_fallback
        )

    async def stream_audio_chunks(
        self,
        text: str,
        persona_key: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Simulates / streams low-latency chunked audio packets (< 400ms TTFAB)
        for WebSocket consumers.
        """
        persona = self.get_persona(persona_key)
        clauses = [c.strip() for c in text.replace(".", "|").replace("!", "|").replace("?", "|").split("|") if c.strip()]
        if not clauses:
            clauses = [text]

        for idx, clause in enumerate(clauses):
            clause_wav = self.generate_acoustic_fallback_wav(clause, persona)
            chunk_b64 = base64.b64encode(clause_wav).decode("ascii")
            
            yield {
                "chunk_index": idx,
                "is_final": idx == len(clauses) - 1,
                "clause_text": clause,
                "persona": persona.id,
                "mime_type": "audio/wav",
                "audio_base64": chunk_b64,
                "timestamp_ms": idx * 600
            }
            # Short non-blocking yield interval mimicking real-time vocal cadence
            await asyncio.sleep(0.08)


# ---------------------------------------------------------------------------
# 4. Canonical Hackathon Scenarios & Script Repository
# ---------------------------------------------------------------------------

HACKATHON_SCENARIOS: Dict[str, Dict[str, Any]] = {
    "crisis_accident": {
        "scenario_id": "crisis_accident",
        "title": "Scenario 1: Emergency Crisis Triage — Storm Collision on the E40 Highway",
        "tagline": "Zero-form insurance filing & roadside dispatch in under 45 seconds.",
        "recommended_persona": "liesbeth",
        "user_profile": {
            "name": "Luc De Smet",
            "age": 48,
            "role": "Corporate Accountant from Aalst",
            "vehicle": "Volkswagen Passat Variant (1-XYZ-842)",
            "policy": "KBC Omnium Comfort Polis #94-B-883120",
            "deductible_eur": 0.00
        },
        "environmental_state": {
            "location": "E40 Highway KM 42.4 (Wetteren towards Ghent)",
            "weather": "Storm Ciaran torrential rain, wind gusts 85 km/h",
            "ambient_noise_db": 88,
            "user_heart_rate_bpm": 138,
            "stress_index": 0.89
        },
        "steps": [
            {
                "step_index": 1,
                "timestamp_ms": 0,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Luc. Neem een trage, diepe ademhaling. Je spreekt met KBC Haven. Het allerbelangrijkste eerst: ben jij of is er iemand in je wagen fysiek gewond?",
                "spoken_text_en": "Luc. Take a slow, deep breath. You are speaking with KBC Haven. First and most important: are you or is anyone in your car physically injured?",
                "audio_cues": {"wpm": 128, "tone": "grounded_maternal_calm", "pause_after_ms": 400},
                "visual_trigger": {
                    "component": "EmergencyShieldCard",
                    "status": "TRIAGE_ACTIVE",
                    "data": {"incident": "HIGHWAY_COLLISION", "gps": "50.9842 N, 3.8921 E", "stress_level": "CRITICAL"}
                },
                "security_audit": {"pii_sanitized": True, "aikido_verified": True}
            },
            {
                "step_index": 2,
                "timestamp_ms": 7200,
                "speaker": "Luc",
                "persona": "Customer",
                "spoken_text_nl": "N-nee, mijn arm heeft een blauwe plek, maar ik leef nog. Maar mijn radiator lekt, er komt stoom uit de motorkap en vrachtwagens razen voorbij tegen 90 per uur. Ik sta te trillen!",
                "spoken_text_en": "N-no, my arm is bruised, but I'm in one piece. But my radiator burst, steam is everywhere, and trucks are speeding past at 90 km/h. I'm trembling!",
                "audio_cues": {"voice_tremor_detected": True, "respiratory_rate": "high"}
            },
            {
                "step_index": 3,
                "timestamp_ms": 14500,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Luc, luister alleen naar mijn stem. Blijf kalm. Trek nu meteen je gele veiligheidshesje aan, stap voorzichtig uit langs de passagierskant weg van het verkeer, en ga achter de stalen vangrail in het gras staan. Zeg me zodra je veilig staat.",
                "spoken_text_en": "Luc, listen only to my voice. Keep calm. Put on your high-visibility yellow vest right now, step out passenger side away from traffic, and step behind the steel guardrail onto the grass. Tell me as soon as you are standing safely.",
                "audio_cues": {"wpm": 122, "tone": "authoritative_safety_protocol", "pause_after_ms": 600},
                "visual_trigger": {
                    "component": "PhysicalSafetyChecklist",
                    "checklist": [
                        {"item": "Safety Vest On", "completed": True},
                        {"item": "Exit Passenger Door", "completed": True},
                        {"item": "Behind Guardrail on Grass", "completed": True}
                    ]
                }
            },
            {
                "step_index": 4,
                "timestamp_ms": 25000,
                "speaker": "Luc",
                "persona": "Customer",
                "spoken_text_nl": "Oké... oké, ik heb mijn hesje aan en ik sta veilig achter de vangrail.",
                "spoken_text_en": "Okay... okay, I have my vest on and I am safely behind the guardrail."
            },
            {
                "step_index": 5,
                "timestamp_ms": 29000,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Uitstekend gedaan. Richt nu rustig je camera naar je wagen. Blijf veilig achter de vangrail en beweeg je camera even langs de voorkant.",
                "spoken_text_en": "Well done. Now gently point your phone camera toward your car. Stay safely behind the guardrail and pan across the front bumper.",
                "audio_cues": {"wpm": 130, "tone": "encouraging_support"},
                "visual_trigger": {
                    "component": "MultimodalVisionStream",
                    "detection": {
                        "license_plate": "1-XYZ-842",
                        "damage_type": "Front-right bumper crumple & radiator fluid leak",
                        "severity_score": "Moderate (Non-drivable)"
                    }
                }
            },
            {
                "step_index": 6,
                "timestamp_ms": 38000,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Ik heb de schade gedocumenteerd. Je nummerplaat is 1-XYZ-842. Je KBC Omnium Comfort dekt dit ongeval volledig met 0 euro franchise. De VAB-takeldienst is al vertrokken en arriveert over 12 minuten. Blijf rustig achter de vangrail, ik blijf bij je aan de lijn.",
                "spoken_text_en": "I have documented the damage. Your license plate is 1-XYZ-842. Your KBC Omnium Comfort covers this accident completely with zero deductible. VAB roadside assistance is already dispatched, arriving in 12 minutes. Stay safely behind the guardrail; I will remain right here on the line with you.",
                "audio_cues": {"wpm": 132, "tone": "total_reassurance_closure"},
                "visual_trigger": {
                    "component": "RoadsideDispatchSummary",
                    "data": {
                        "claim_id": "CLM-2026-E40-881",
                        "deductible_eur": 0.00,
                        "tow_truck_provider": "VAB Assistance",
                        "eta_minutes": 12,
                        "replacement_car_reserved": True,
                        "status": "DISPATCH_CONFIRMED"
                    }
                }
            }
        ]
    },

    "financial_anxiety": {
        "scenario_id": "financial_anxiety",
        "title": "Scenario 2: The Zero-Shame Financial Anxiety Shield",
        "tagline": "Proactive dignity-preserving cashflow buffer before overdraft penalties hit.",
        "recommended_persona": "liesbeth",
        "user_profile": {
            "name": "Wim Van Haver",
            "age": 28,
            "role": "Freelance UX Researcher in Antwerp",
            "account_balance_eur": 12.40,
            "days_until_payday": 6,
            "unplanned_expense_eur": 185.00,
            "standard_overdraft_rate_pct": 10.5
        },
        "environmental_state": {
            "trigger": "Unexpected dental surgery invoice debited",
            "stress_type": "Financial shame & avoidance of banking app",
            "stress_index": 0.78
        },
        "steps": [
            {
                "step_index": 1,
                "timestamp_ms": 0,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Dag Wim. Even een zacht signaal van KBC Haven. We zien dat je saldo wat krap staat voor je loon op vrijdag arriveert. Geen stress en geen oordeel.",
                "spoken_text_en": "Hi Wim. A gentle check-in from KBC Haven. We noticed your balance is running a bit tight before your salary arrives on Friday. Zero stress and zero judgment.",
                "audio_cues": {"wpm": 140, "tone": "gentle_respectful_warmth", "pause_after_ms": 350},
                "visual_trigger": {
                    "component": "AnxietyShieldSoftNotice",
                    "data": {"current_balance": 12.40, "days_left": 6, "tone": "LOW_STRESS_AMBER"}
                }
            },
            {
                "step_index": 2,
                "timestamp_ms": 7800,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "In plaats van dure debetrente kunnen we nu met één klik je 14-daagse renteloze KBC Veiligheidsbuffer van 250 euro activeren. Of we pauzeren je spaaropdracht voor deze maand.",
                "spoken_text_en": "Instead of costly overdraft interest, we can activate your 14-day zero-interest KBC Safety Buffer of €250 with a single tap. Or we can pause this month's automated savings transfer.",
                "audio_cues": {"wpm": 144, "tone": "supportive_solution_oriented"},
                "visual_trigger": {
                    "component": "InteractiveCashflowBufferSlider",
                    "data": {
                        "proposed_buffer_eur": 250.00,
                        "interest_rate_pct": 0.0,
                        "penalty_saved_eur": 18.25,
                        "statutory_limit_days": 14
                    }
                }
            },
            {
                "step_index": 3,
                "timestamp_ms": 16500,
                "speaker": "Wim",
                "persona": "Customer",
                "spoken_text_nl": "Ja graag, activeer die renteloze buffer maar.",
                "spoken_text_en": "Yes please, please activate the zero-interest buffer."
            },
            {
                "step_index": 4,
                "timestamp_ms": 19500,
                "speaker": "Haven",
                "persona": "Liesbeth - Flemish Grounded Warmth",
                "spoken_text_nl": "Het is meteen in orde gebracht, Wim. Je buffer van 250 euro staat per direct actief en je saldo blijft veilig positief. Geniet van je avond, wij waken over de rest.",
                "spoken_text_en": "Done in an instant, Wim. Your €250 buffer is immediately active, keeping your balance comfortably positive. Enjoy your evening; we'll watch over the rest.",
                "audio_cues": {"wpm": 142, "tone": "warm_closure_relief"},
                "visual_trigger": {
                    "component": "BufferActivationConfirmation",
                    "data": {
                        "status": "ACTIVE",
                        "buffer_amount": 250.00,
                        "interest_applied": "0.00%",
                        "itsme_authenticated": True,
                        "anxiety_score_drop": "0.78 -> 0.08"
                    }
                }
            }
        ]
    },

    "sme_cashflow": {
        "scenario_id": "sme_cashflow",
        "title": "Scenario 3: SME Runway & SD Worx Verified Provenance",
        "tagline": "Instant legal provenance, PC 200 payroll resolution & warm expert handoff.",
        "recommended_persona": "marc",
        "user_profile": {
            "name": "Marc Dubois",
            "age": 42,
            "role": "Founder & Managing Director, CloudScale BV (Brussels)",
            "sectoral_committee": "PC 200 (Joint Industrial Committee)",
            "disputed_amount_eur": 140.00,
            "topic": "Mobility Budget Pillar 2 Tax Deduction"
        },
        "environmental_state": {
            "context": "Employee dispute over taxable fringe benefit on public transport pass",
            "regulatory_framework": "Belgian Royal Decree Art. 38ter & Circular 2024/C/82",
            "stress_index": 0.55
        },
        "steps": [
            {
                "step_index": 1,
                "timestamp_ms": 0,
                "speaker": "Marc Dubois",
                "persona": "Customer",
                "spoken_text_nl": "Waarom is mijn mobiliteitsbudget deze maand plots met 140 euro gedaald op mijn loonbrief? Mijn HR-manager zei dat dit 100% fiscaal vrijgesteld zou zijn!",
                "spoken_text_en": "Why did my mobility budget payout drop by €140 this month on my payslip? My HR manager told me this would be 100% tax exempt!"
            },
            {
                "step_index": 2,
                "timestamp_ms": 7500,
                "speaker": "SD Worx TrustVoice",
                "persona": "Marc - Belgian Executive Advisor",
                "spoken_text_nl": "Begrijpelijke vraag, Marc. We hebben je loonbrief van deze maand en het PC 200 barema er meteen bij genomen. Laten we samen naar de exacte juridische bron kijken.",
                "spoken_text_en": "A completely understandable question, Marc. We have pulled up this month's payslip and your PC 200 statutory table right now. Let us inspect the exact legal source together.",
                "audio_cues": {"wpm": 150, "tone": "crisp_executive_transparency"},
                "visual_trigger": {
                    "component": "DualScreenPayslipInspector",
                    "data": {
                        "payslip_row": "Lijn 14: Mobiliteitsbudget Pijler 2",
                        "deduction_eur": 140.00,
                        "highlight_color": "blue"
                    }
                }
            },
            {
                "step_index": 3,
                "timestamp_ms": 16500,
                "speaker": "SD Worx TrustVoice",
                "persona": "Marc - Belgian Executive Advisor",
                "spoken_text_nl": "Onder het Koninklijk Besluit Artikel 38ter blijft pijler 2 vrijgesteld. Maar je bedrijfspolicy, geregistreerd onder referentie HR-BE-2026-v3 op 15 januari, heeft je treinkaartje geboekt onder standaard woon-werkverkeer. Daardoor geldt de fiscale inhouding.",
                "spoken_text_en": "Under Royal Decree Article 38ter, pillar 2 remains exempt. However, your corporate expense policy (reference HR-BE-2026-v3, signed Jan 15) classified your train pass under standard commuting. That triggered the statutory tax deduction.",
                "audio_cues": {"wpm": 148, "tone": "precise_grounded_provenance"},
                "visual_trigger": {
                    "component": "TrustProvenanceLedger",
                    "data": {
                        "primary_statute": "Belgisch Staatsblad Art. 38ter (RD 2026/04)",
                        "policy_reference": "SD Worx / CloudScale HR-BE-2026-v3",
                        "confidence_score": "99.4% (Green Certified)",
                        "aikido_rbac_audit": "Clean / Zero cross-tenant leakage"
                    }
                }
            },
            {
                "step_index": 4,
                "timestamp_ms": 28000,
                "speaker": "SD Worx TrustVoice",
                "persona": "Marie - Bilingual Empathy",
                "spoken_text_nl": "Wil je dat ik een gecertificeerde correctienota klaarzet voor je HR-verantwoordelijke Sarah Van den Berghe, of zullen we een korte videocall met haar inplannen om 14u15?",
                "spoken_text_en": "Would you like me to prepare a certified correction note for your HR lead Sarah Van den Berghe, or shall we schedule a quick call with her at 2:15 PM?",
                "audio_cues": {"wpm": 142, "tone": "diplomatic_warm_handoff"},
                "visual_trigger": {
                    "component": "ExpertHandoffActionCard",
                    "actions": [
                        {"id": "draft_correction", "label": "Draft Certified HR Correction Note", "type": "primary"},
                        {"id": "schedule_call", "label": "Book 15-min Call with Sarah Van den Berghe", "type": "secondary"}
                    ]
                }
            }
        ]
    }
}


def get_scenario_script(scenario_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns the exact conversational script, timestamps, and Generative UI triggers
    for one of the 3 scenarios. Supports friendly alias names.
    """
    normalized = scenario_id.lower().strip()
    if normalized in ("crisis", "accident", "e40", "e40_accident", "crisis_accident"):
        return HACKATHON_SCENARIOS["crisis_accident"]
    if normalized in ("anxiety", "financial_anxiety", "wim", "buffer", "overdraft"):
        return HACKATHON_SCENARIOS["financial_anxiety"]
    if normalized in ("sme", "sme_cashflow", "sdworx", "trustvoice", "sdworx_trustvoice", "payroll"):
        return HACKATHON_SCENARIOS["sme_cashflow"]
    return None


def list_available_scenarios() -> List[Dict[str, Any]]:
    """Returns summaries for all available canonical hackathon scenarios."""
    return [
        {
            "scenario_id": s["scenario_id"],
            "title": s["title"],
            "tagline": s["tagline"],
            "recommended_persona": s["recommended_persona"],
            "step_count": len(s["steps"])
        }
        for s in HACKATHON_SCENARIOS.values()
    ]


# Global singleton service instance
voice_service = ElevenLabsVoiceService()
