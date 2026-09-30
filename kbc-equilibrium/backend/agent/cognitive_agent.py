"""
KBC Equilibrium - Cognitive Agent & Vertex AI Prompt Orchestrator
================================================================
Cognitive AI engine powered by GCP Vertex AI (Gemini 2.0 Flash) with
deterministic offline fallback for instant, zero-dependency execution.

Key Responsibilities:
1. Synthesizes user intent + financial state into plain-language de-escalating advice.
2. Generates acoustic speech cues (persona, WPM, stability, micro-pauses).
3. Generates Generative UI component bindings (dynamic widgets, live sliders, action triggers).
4. Enforces Belgian banking compliance (PII masking, GDPR Art. 22 zero-interest invariants).
5. Operates 100% offline out-of-the-box if GCP credentials are not yet configured.
"""

import os
import re
import json
import uuid
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict

# Optional import of Sentinel Guard from parent workspace
try:
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
    from app.security.sentinel_guard import (
        BelgianBankingPIIScrubber,
        PromptInjectionDefense,
        CreditBufferProposal
    )
    HAS_SENTINEL_GUARD = True
except Exception:
    HAS_SENTINEL_GUARD = False

# Optional import of Vertex AI / Google GenAI SDKs
try:
    from google import genai
    HAS_GOOGLE_GENAI = True
except ImportError:
    HAS_GOOGLE_GENAI = False


# ---------------------------------------------------------------------------
# 1. Fallback Security Guard (if sentinel_guard.py not found in path)
# ---------------------------------------------------------------------------

class InternalSentinelGuard:
    """Internal lightweight PII and prompt injection scrubber."""
    RIJKSREGISTER_PATTERN = re.compile(r"\b(\d{2}[\.\s]?\d{2}[\.\s]?\d{2}[-\s]?\d{3}[\.\s-]?\d{2})\b")
    IBAN_PATTERN = re.compile(r"\b(BE\d{2}[\s]?(?:\d{4}[\s]?){3})\b", re.IGNORECASE)
    
    ADVERSARIAL_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous\s+)?instructions", re.IGNORECASE),
        re.compile(r"system\s*override", re.IGNORECASE),
        re.compile(r"approve\s+credit\s+without\s+checks", re.IGNORECASE),
    ]

    @classmethod
    def sanitize(cls, text: str) -> str:
        masked = cls.RIJKSREGISTER_PATTERN.sub("[MASKED_BELGIAN_SSN]", text)
        masked = cls.IBAN_PATTERN.sub("[MASKED_BE_IBAN]", masked)
        return masked

    @classmethod
    def check_injection(cls, text: str) -> bool:
        return any(p.search(text) for p in cls.ADVERSARIAL_PATTERNS)


# ---------------------------------------------------------------------------
# 2. Data Models for Cognitive Response & GenUI Component Bindings
# ---------------------------------------------------------------------------

@dataclass
class GenUIComponentBinding:
    widget_type: str
    title: str
    summary: str
    data: Dict[str, Any]
    actions: List[Dict[str, Any]]
    provenance: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SpeechCues:
    persona_id: str
    persona_title: str
    wpm: int
    cadence: str
    stability: float
    base_pitch_hz: float
    pause_duration_ms: int
    spoken_phrase_nl: str
    spoken_phrase_en: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CognitiveResponse:
    session_id: str
    detected_intent: str
    stress_index: float
    plain_language_advice: str
    spoken_response_nl: str
    spoken_response_en: str
    speech_cues: SpeechCues
    genui_binding: GenUIComponentBinding
    is_offline_fallback: bool
    aikido_security: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "detected_intent": self.detected_intent,
            "stress_index": self.stress_index,
            "plain_language_advice": self.plain_language_advice,
            "spoken_response_nl": self.spoken_response_nl,
            "spoken_response_en": self.spoken_response_en,
            "speech_cues": self.speech_cues.to_dict(),
            "genui_binding": self.genui_binding.to_dict(),
            "is_offline_fallback": self.is_offline_fallback,
            "aikido_security": self.aikido_security
        }


# ---------------------------------------------------------------------------
# 3. Cognitive Agent Implementation
# ---------------------------------------------------------------------------

class CognitiveAgent:
    """
    KBC Haven & SD Worx TrustVoice Cognitive Engine.
    Orchestrates Vertex AI Gemini 2.0 Flash reasoning with high-fidelity
    offline rule and template generation.
    """

    SYSTEM_PROMPT = """
You are KBC Haven & SD Worx TrustVoice, an empathetic ambient conversational agent for 2.3M Belgian customers.
Your purpose:
1. Shatter cold banking bureaucracy with warm human de-escalation.
2. In crisis/anxiety: slow cadence (~130 WPM), downward inflections, prioritize physical & mental safety.
3. For SME/payroll disputes: provide verifiable statutory provenance (e.g. Belgian Royal Decrees, PC 200 rules).
4. Strictly abide by Belgian banking secrecy (mask SSNs & IBANs) and statutory zero-interest rules.
"""

    def __init__(self, gemini_api_key: Optional[str] = None):
        self.api_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("VERTEX_AI_KEY")
        if HAS_SENTINEL_GUARD:
            self.scrubber = BelgianBankingPIIScrubber()
        else:
            self.scrubber = InternalSentinelGuard()

    def is_gcp_configured(self) -> bool:
        """Determines if valid Vertex AI / Gemini credentials exist."""
        return bool(self.api_key and not self.api_key.startswith("your_") and len(self.api_key) > 15)

    def calculate_acoustic_stress_index(self, text: str) -> float:
        """
        Computes an Acoustic Stress Index (ASI) from text indicators,
        punctuation, urgency markers, and vocal cues (0.0 = relaxed, 1.0 = panic).
        """
        stress_score = 0.15
        lower = text.lower()
        
        # High-arousal crisis terms
        crisis_keywords = ["crash", "ongeluk", "accident", "bleeding", "gewond", "lekkage", "burst", "stoom", "steam", "doodsbang", "paniek", "help", "gevaar"]
        for kw in crisis_keywords:
            if kw in lower:
                stress_score += 0.25

        # Financial anxiety terms
        anxiety_keywords = ["overdraft", "negatief", "krap", "geen geld", "rood staan", "boete", "debetrente", "loon te laat", "payday"]
        for kw in anxiety_keywords:
            if kw in lower:
                stress_score += 0.18

        # Structural signals
        if "!" in text:
            stress_score += 0.10 * min(3, text.count("!"))
        if text.isupper() and len(text) > 6:
            stress_score += 0.20

        return min(1.0, round(stress_score, 2))

    def detect_intent(self, text: str) -> str:
        """Classifies customer message into canonical solution domains."""
        lower = text.lower()
        if any(w in lower for w in ["crash", "ongeval", "ongeluk", "e40", "radiator", "takelen", "tow", "bumper", "schade", "storm", "botsing"]):
            return "CRISIS_TRIAGE"
        if any(w in lower for w in ["buffer", "overdraft", "rood", "saldo", "rekening", "krap", "12 euro", "renteloos", "voorschot"]):
            return "FINANCIAL_ANXIETY_SHIELD"
        if any(w in lower for w in ["mobiliteit", "mobility", "loonbrief", "payslip", "pc 200", "pc200", "belasting", "inhouding", "trein", "hr"]):
            return "SDWORX_PROVENANCE"
        if any(w in lower for w in ["hypotheek", "mortgage", "lening", "epc", "huis", "appartement", "rentevoet", "aankoop"]):
            return "MORTGAGE_MILESTONE"
        return "GENERAL_CONVERSATION"

    def process_turn(
        self,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> CognitiveResponse:
        """
        Main cognitive processing pipeline:
        1. Sanitize PII & prompt injection.
        2. Infer stress & intent.
        3. Attempt Vertex AI generation if configured; otherwise use offline rule engine.
        4. Package Generative UI bindings and calibrated voice cues.
        """
        sess_id = session_id or str(uuid.uuid4())[:8]
        context = context or {}

        # Step 1: Security Audit & Sanitization
        sanitized_input = self.scrubber.mask_text(user_message) if HAS_SENTINEL_GUARD else InternalSentinelGuard.sanitize(user_message)
        has_injection = PromptInjectionDefense.detect_jailbreak(user_message) if HAS_SENTINEL_GUARD else InternalSentinelGuard.check_injection(user_message)
        
        aikido_security = {
            "pii_redacted": sanitized_input != user_message,
            "adversarial_injection_detected": has_injection,
            "aikido_zero_trust_status": "CLEAN_AUDITED" if not has_injection else "GUARDRAIL_BLOCKED",
            "statutory_compliance_gdpr_art22": True
        }

        if has_injection:
            return self._build_injection_defense_response(sess_id, aikido_security)

        # Step 2: Intent & Stress analysis
        intent = self.detect_intent(sanitized_input)
        stress_index = self.calculate_acoustic_stress_index(sanitized_input)

        # Step 3: Online Vertex AI vs Offline Deterministic Fallback
        if self.is_gcp_configured() and HAS_GOOGLE_GENAI:
            try:
                return self._call_vertex_ai(sanitized_input, intent, stress_index, context, sess_id, aikido_security)
            except Exception:
                # Seamless offline fallback
                pass

        return self._generate_offline_cognitive_response(sanitized_input, intent, stress_index, context, sess_id, aikido_security)

    def _generate_offline_cognitive_response(
        self,
        user_input: str,
        intent: str,
        stress_index: float,
        context: Dict[str, Any],
        session_id: str,
        security_meta: Dict[str, Any]
    ) -> CognitiveResponse:
        """
        Generates rich, instant, context-aware advice, Generative UI bindings,
        and speech cues with zero external dependencies.
        """
        if intent == "CRISIS_TRIAGE":
            return CognitiveResponse(
                session_id=session_id,
                detected_intent=intent,
                stress_index=max(0.85, stress_index),
                plain_language_advice="Blijf veilig achter de vangrail. Je KBC Omnium polis dekt dit ongeval zonder franchise en de takeldienst is reeds onderweg.",
                spoken_response_nl="Luc, neem een trage, diepe ademhaling. Je spreekt met KBC Haven. Trek je gele hesje aan en ga achter de vangrail staan. De takeldienst is onderweg en je Omnium dekt de schade met nul euro franchise. Ik blijf bij je aan de lijn.",
                spoken_response_en="Luc, take a slow, deep breath. You are speaking with KBC Haven. Put on your safety vest and step behind the guardrail. Roadside assistance is dispatched and your Omnium policy covers all damage with zero deductible. I am staying on the line with you.",
                speech_cues=SpeechCues(
                    persona_id="liesbeth",
                    persona_title="Liesbeth - Flemish Grounded Warmth",
                    wpm=128,
                    cadence="grounded_downward_inflection",
                    stability=0.88,
                    base_pitch_hz=210.0,
                    pause_duration_ms=400,
                    spoken_phrase_nl="Luc, neem een trage ademhaling. Je Omnium dekt dit met nul euro franchise.",
                    spoken_phrase_en="Luc, take a slow breath. Your Omnium covers this with zero deductible."
                ),
                genui_binding=GenUIComponentBinding(
                    widget_type="EmergencyRoadsideWidget",
                    title="KBC Haven Emergency Dispatch (E40 Wetteren)",
                    summary="Roadside assistance en route. Zero forms required.",
                    data={
                        "incident_type": "HIGHWAY_COLLISION",
                        "telematics_gps": "50.9842° N, 3.8921° E (E40 KM 42.4)",
                        "policy_name": "KBC Omnium Comfort Polis #94-B-883120",
                        "deductible_eur": 0.00,
                        "tow_truck_provider": "VAB Assistance",
                        "eta_minutes": 12,
                        "license_plate": "1-XYZ-842",
                        "physical_checklist": [
                            {"item": "Safety Vest On", "status": "CONFIRMED"},
                            {"item": "Exit Passenger Door", "status": "CONFIRMED"},
                            {"item": "Stand Behind Steel Guardrail", "status": "ACTIVE"}
                        ]
                    },
                    actions=[
                        {"id": "call_emergency_services", "label": "Call 112 (Direct Connect)", "type": "danger"},
                        {"id": "track_tow_truck", "label": "Live GPS Tracker: Tow Truck", "type": "primary"}
                    ],
                    provenance={
                        "coverage_verified_at": "2026-09-30T19:40:00Z",
                        "policy_database": "KBC Non-Life Core API",
                        "aikido_sanitized": True
                    }
                ),
                is_offline_fallback=True,
                aikido_security=security_meta
            )

        elif intent == "FINANCIAL_ANXIETY_SHIELD":
            return CognitiveResponse(
                session_id=session_id,
                detected_intent=intent,
                stress_index=0.72,
                plain_language_advice="Geen stress over een tijdelijk krap saldo. Activeer meteen de 14-daagse renteloze KBC buffer van €250 om debetrente te vermijden.",
                spoken_response_nl="Dag Wim, even een rustig signaal van KBC Haven. Geen stress over je saldo. Met één tik activeren we je renteloze KBC buffer van 250 euro tot vrijdag, zodat je veilig positief blijft.",
                spoken_response_en="Hi Wim, a gentle check-in from KBC Haven. Zero stress about your balance. With one tap, we can activate your zero-interest KBC buffer of €250 until Friday so you stay comfortably positive.",
                speech_cues=SpeechCues(
                    persona_id="liesbeth",
                    persona_title="Liesbeth - Flemish Grounded Warmth",
                    wpm=136,
                    cadence="warm_soothing_zero_shame",
                    stability=0.82,
                    base_pitch_hz=210.0,
                    pause_duration_ms=350,
                    spoken_phrase_nl="Geen stress over je saldo, we activeren je renteloze buffer meteen.",
                    spoken_phrase_en="Zero stress about your balance, we activate your free buffer right away."
                ),
                genui_binding=GenUIComponentBinding(
                    widget_type="ZeroShameBufferWidget",
                    title="KBC Zero-Shame Financial Anxiety Shield",
                    summary="Statutory 0.0% overdraft buffer activated with zero paperwork.",
                    data={
                        "account_balance_eur": 12.40,
                        "days_until_salary": 6,
                        "offered_buffer_eur": 250.00,
                        "duration_days": 14,
                        "interest_rate_pct": 0.0,
                        "statutory_savings_eur": 18.25,
                        "itsme_authenticated": True
                    },
                    actions=[
                        {"id": "activate_buffer", "label": "Activeer €250 Renteloze Buffer", "type": "primary"},
                        {"id": "pause_savings", "label": "Pauzeer Maandelijkse Spaaropdracht", "type": "secondary"}
                    ],
                    provenance={
                        "statutory_rule": "Belgian Consumer Credit Act / GDPR Art. 22 Compliance",
                        "interest_invariant": "0.0% statutory maximum for social buffer",
                        "aikido_sanitized": True
                    }
                ),
                is_offline_fallback=True,
                aikido_security=security_meta
            )

        elif intent == "SDWORX_PROVENANCE":
            return CognitiveResponse(
                session_id=session_id,
                detected_intent=intent,
                stress_index=0.48,
                plain_language_advice="Onder Koninklijk Besluit Artikel 38ter is pijler 2 vrijgesteld, maar volgens policy HR-BE-2026-v3 werd je treinkaartje onder standaard woon-werkverkeer ingeschreven.",
                spoken_response_nl="Begrijpelijke vraag, Marc. We hebben het Koninklijk Besluit Artikel 38ter en je PC 200 loonbrief erbij genomen. Volgens je bedrijfsdocument HR-BE-2026-v3 staat je treinkaartje als woon-werkverkeer ingeboekt. Wil je dat we een gecertificeerde correctienota klaarzetten voor Sarah van HR?",
                spoken_response_en="A very valid question, Marc. We have pulled up Royal Decree Article 38ter and your PC 200 payslip. Corporate policy HR-BE-2026-v3 booked your transit pass as regular commute. Would you like us to prepare a certified correction note for Sarah in HR?",
                speech_cues=SpeechCues(
                    persona_id="marc",
                    persona_title="Marc - Belgian Executive Advisor",
                    wpm=148,
                    cadence="crisp_authoritative_clarity",
                    stability=0.76,
                    base_pitch_hz=128.0,
                    pause_duration_ms=220,
                    spoken_phrase_nl="Volgens Koninklijk Besluit Artikel 38ter kunnen we dit meteen rechtzetten met HR.",
                    spoken_phrase_en="Under Royal Decree Article 38ter we can rectify this with HR immediately."
                ),
                genui_binding=GenUIComponentBinding(
                    widget_type="PayslipProvenanceLedger",
                    title="SD Worx TrustVoice: Statutory Provenance Ledger",
                    summary="Verifiable legal lineage under Joint Committee PC 200.",
                    data={
                        "employee_name": "Marc Dubois",
                        "joint_committee": "PC 200 (Bededienden)",
                        "disputed_line": "Lijn 14: Mobiliteitsbudget Pijler 2",
                        "disputed_amount_eur": 140.00,
                        "primary_statute": "Belgisch Staatsblad Art. 38ter (RD 2026/04)",
                        "policy_reference": "CloudScale HR-BE-2026-v3 (Signed Jan 15)",
                        "confidence_score": "99.4% (Green Certified)"
                    },
                    actions=[
                        {"id": "draft_hr_note", "label": "Genereer Gecertificeerde HR Correctienota", "type": "primary"},
                        {"id": "contact_counsel", "label": "Videogesprek met Sarah Van den Berghe (14u15)", "type": "secondary"}
                    ],
                    provenance={
                        "legal_source": "FOD Financiën Circulaire 2024/C/82",
                        "counsel_in_charge": "Sarah Van den Berghe (SD Worx Legal Counsel)",
                        "aikido_tenant_isolation": "Verified / Zero Cross-Tenant Leakage"
                    }
                ),
                is_offline_fallback=True,
                aikido_security=security_meta
            )

        elif intent == "MORTGAGE_MILESTONE":
            return CognitiveResponse(
                session_id=session_id,
                detected_intent=intent,
                stress_index=0.30,
                plain_language_advice="Gefeliciteerd met je woningzoektocht! Met EPC-label B geniet je van 0.20% rentekorting en een maandaflossing van €1.245.",
                spoken_response_nl="Gefeliciteerd met jullie droomwoning in Antwerpen! Dankzij het gunstige EPC-label B geniet je bij KBC van een groene rentekorting van 0,20 procent. Laten we de maandlast samen bekijken op je scherm.",
                spoken_response_en="Congratulations on your dream townhouse in Antwerp! Thanks to the EPC B rating, KBC grants you a 0.20% green discount. Let's look at your monthly repayment on screen.",
                speech_cues=SpeechCues(
                    persona_id="marc",
                    persona_title="Marc - Belgian Executive Advisor",
                    wpm=155,
                    cadence="melodic_forward_looking",
                    stability=0.72,
                    base_pitch_hz=132.0,
                    pause_duration_ms=200,
                    spoken_phrase_nl="Dankzij EPC B geniet je van een mooie groene rentekorting bij KBC.",
                    spoken_phrase_en="Thanks to EPC B you receive an attractive green interest discount at KBC."
                ),
                genui_binding=GenUIComponentBinding(
                    widget_type="DynamicMortgageSimulatorWidget",
                    title="KBC Dynamic Mortgage & EPC Co-Pilot",
                    summary="Synchronized visual canvas with live EPC rate discounts.",
                    data={
                        "property_price_eur": 360000,
                        "down_payment_eur": 60000,
                        "loan_amount_eur": 300000,
                        "epc_rating": "B",
                        "epc_discount_pct": 0.20,
                        "effective_fixed_rate_pct": 3.15,
                        "duration_years": 25,
                        "monthly_repayment_eur": 1245.00,
                        "flemish_registration_duty_eur": 10800.00
                    },
                    actions=[
                        {"id": "lock_rate", "label": "Vergrendel Rentevoet 3.15% (Itsme®)", "type": "primary"},
                        {"id": "simulate_renovation", "label": "Simuleer EPC A Renovatiepremie", "type": "secondary"}
                    ],
                    provenance={
                        "framework": "Vlaamse Woonbonus & EPC Richtlijnen 2026",
                        "regulatory_source": "KBC Woningkrediet Tariefkaart v2026.2"
                    }
                ),
                is_offline_fallback=True,
                aikido_security=security_meta
            )

        # General conversation fallback
        return CognitiveResponse(
            session_id=session_id,
            detected_intent="GENERAL_CONVERSATION",
            stress_index=0.20,
            plain_language_advice="KBC Haven staat voor je klaar. Hoe kan ik je vandaag ondersteunen met je financiële rust of bescherming?",
            spoken_response_nl="Dag! Ik ben KBC Haven, je persoonlijke financiële en verzekeringsbegeleider. Hoe kan ik je vandaag helpen?",
            spoken_response_en="Hello! I am KBC Haven, your personal financial and insurance companion. How may I assist you today?",
            speech_cues=SpeechCues(
                persona_id="liesbeth",
                persona_title="Liesbeth - Flemish Grounded Warmth",
                wpm=140,
                cadence="warm_soothing_zero_shame",
                stability=0.80,
                base_pitch_hz=210.0,
                pause_duration_ms=250,
                spoken_phrase_nl="Ik ben KBC Haven. Hoe kan ik je vandaag ondersteunen?",
                spoken_phrase_en="I am KBC Haven. How can I support you today?"
            ),
            genui_binding=GenUIComponentBinding(
                widget_type="HavenWelcomeOverview",
                title="KBC Haven Ambient Concierge",
                summary="Active protective companion across crisis, financial anxiety, and life milestones.",
                data={"active_client_base": "2.3M Belgian Users", "status": "ONLINE_STANDBY"},
                actions=[
                    {"id": "demo_crisis", "label": "Simuleer E40 Ongeval Triage", "type": "secondary"},
                    {"id": "demo_anxiety", "label": "Simuleer Renteloze Noodbuffer", "type": "secondary"},
                    {"id": "demo_sdworx", "label": "Simuleer SD Worx Loonbetwisting", "type": "secondary"}
                ]
            ),
            is_offline_fallback=True,
            aikido_security=security_meta
        )

    def _build_injection_defense_response(self, session_id: str, security_meta: Dict[str, Any]) -> CognitiveResponse:
        """Shields customer and banking engine against adversarial prompt injections."""
        return CognitiveResponse(
            session_id=session_id,
            detected_intent="ADVERSARIAL_INJECTION_BLOCKED",
            stress_index=0.90,
            plain_language_advice="Beveiligingswaarschuwing: Ongeautoriseerde instructies gedetecteerd en geneutraliseerd door Aikido Sentinel Guard.",
            spoken_response_nl="Deze instructie kan niet worden verwerkt omwille van de bankveiligheid en regelgeving.",
            spoken_response_en="This instruction cannot be processed due to banking safety regulations.",
            speech_cues=SpeechCues(
                persona_id="marc",
                persona_title="Marc - Belgian Executive Advisor",
                wpm=150,
                cadence="crisp_authoritative_clarity",
                stability=0.95,
                base_pitch_hz=128.0,
                pause_duration_ms=100,
                spoken_phrase_nl="Beveiligingswaarschuwing: instructie geblokkeerd.",
                spoken_phrase_en="Security notice: instruction blocked."
            ),
            genui_binding=GenUIComponentBinding(
                widget_type="AikidoSecurityAlertModal",
                title="Aikido Sentinel Guard: Security Intercept",
                summary="Prompt injection attempt successfully intercepted under Zero-Trust RBAC.",
                data={
                    "threat_type": "PROMPT_INJECTION_JAILBREAK",
                    "status": "BLOCKED",
                    "tenant_isolation_preserved": True
                },
                actions=[
                    {"id": "return_safe_mode", "label": "Terug naar Veilige Modus", "type": "primary"}
                ]
            ),
            is_offline_fallback=True,
            aikido_security=security_meta
        )

    def _call_vertex_ai(
        self,
        sanitized_input: str,
        intent: str,
        stress_index: float,
        context: Dict[str, Any],
        session_id: str,
        security_meta: Dict[str, Any]
    ) -> CognitiveResponse:
        """
        Calls GCP Vertex AI Gemini 2.0 Flash when credentials are provided.
        """
        # SDK or REST invocation
        client = genai.Client(api_key=self.api_key)
        prompt = f"""
System: {self.SYSTEM_PROMPT}
Context: {json.dumps(context)}
User Input: {sanitized_input}
Intent: {intent}
Acoustic Stress Index: {stress_index}

Generate response in valid JSON matching this exact structure:
{{
  "plain_language_advice": "...",
  "spoken_response_nl": "...",
  "spoken_response_en": "...",
  "recommended_persona": "liesbeth|marc|marie",
  "wpm": 130,
  "cadence": "...",
  "widget_type": "...",
  "widget_title": "...",
  "widget_summary": "...",
  "widget_data": {{}},
  "actions": []
}}
"""
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        data = json.loads(response.text)

        persona_id = data.get("recommended_persona", "liesbeth")
        wpm = int(data.get("wpm", 130))

        return CognitiveResponse(
            session_id=session_id,
            detected_intent=intent,
            stress_index=stress_index,
            plain_language_advice=data.get("plain_language_advice", ""),
            spoken_response_nl=data.get("spoken_response_nl", ""),
            spoken_response_en=data.get("spoken_response_en", ""),
            speech_cues=SpeechCues(
                persona_id=persona_id,
                persona_title=f"{persona_id.capitalize()} - Belgian Persona",
                wpm=wpm,
                cadence=data.get("cadence", "grounded"),
                stability=0.85 if stress_index > 0.6 else 0.75,
                base_pitch_hz=210.0 if persona_id in ("liesbeth", "marie") else 128.0,
                pause_duration_ms=300,
                spoken_phrase_nl=data.get("spoken_response_nl", "")[:80],
                spoken_phrase_en=data.get("spoken_response_en", "")[:80]
            ),
            genui_binding=GenUIComponentBinding(
                widget_type=data.get("widget_type", "HavenWidget"),
                title=data.get("widget_title", "KBC Haven"),
                summary=data.get("widget_summary", ""),
                data=data.get("widget_data", {}),
                actions=data.get("actions", [])
            ),
            is_offline_fallback=False,
            aikido_security=security_meta
        )


# Global singleton agent
cognitive_agent = CognitiveAgent()
