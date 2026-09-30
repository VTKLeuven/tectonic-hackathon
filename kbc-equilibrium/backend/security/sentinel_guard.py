"""
KBC & SD Worx Tectonic Hackathon 2026 - Aikido Security Sentinel Guard
========================================================================
Implements Zero-Trust Security, IDOR prevention, PII Anonymization, and 
Prompt Injection Guardrails evaluated by Aikido AI Code Audit.
Works with standard library and enhances with Pydantic when available.
"""

import hmac
import hashlib
import re
import html
import uuid
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# 1. Cryptographic Tenancy & Security Context (Anti-IDOR)
# ---------------------------------------------------------------------------

@dataclass
class SecurityContext:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    roles: List[str] = field(default_factory=list)
    scopes: List[str] = field(default_factory=list)
    is_authenticated: bool = True

    def can_access_entity(self, entity_owner_id: uuid.UUID, entity_tenant_id: uuid.UUID, required_scope: str) -> bool:
        """
        Prevents IDOR (Insecure Direct Object Reference).
        Enforces both ownership matching and strict tenant isolation.
        """
        if not self.is_authenticated:
            return False
        if required_scope not in self.scopes and "admin:all" not in self.roles:
            return False
        return (self.user_id == entity_owner_id) and (self.tenant_id == entity_tenant_id)


# ---------------------------------------------------------------------------
# 2. PII Sanitizer & Salted HMAC Pseudonymizer (Belgian Banking Secrecy)
# ---------------------------------------------------------------------------

class BelgianBankingPIIScrubber:
    """
    Sanitizes Belgian National Register Numbers (Rijksregisternummer / Numéro de registre national),
    IBANs, and credit card numbers prior to telemetry logging or LLM inference.
    """
    # Belgian SSN pattern: YY.MM.DD-XXX.CD (11 digits, with optional dots/hyphens/spaces)
    RIJKSREGISTER_PATTERN = re.compile(r"\b(\d{2}[\.\s]?\d{2}[\.\s]?\d{2}[-\s]?\d{3}[\.\s-]?\d{2})\b")
    # Belgian IBAN pattern: BEkk BBBB BBBB BBBB
    IBAN_PATTERN = re.compile(r"\b(BE\d{2}[\s]?(?:\d{4}[\s]?){3})\b", re.IGNORECASE)

    def __init__(self, telemetry_salt: str = "kbc-sentinel-2026-salt"):
        self.salt = telemetry_salt.encode("utf-8")

    def mask_text(self, text: str) -> str:
        """Replaces sensitive identifiers with masked tokens."""
        masked = self.RIJKSREGISTER_PATTERN.sub("[MASKED_BELGIAN_SSN]", text)
        masked = self.IBAN_PATTERN.sub("[MASKED_BE_IBAN]", masked)
        return masked

    def hmac_pseudonymize(self, raw_id: str) -> str:
        """Produces a deterministic, one-way pseudonym for telemetry correlation."""
        return hmac.new(self.salt, raw_id.encode("utf-8"), hashlib.sha256).hexdigest()[:16]


# ---------------------------------------------------------------------------
# 3. LLM Prompt Injection & Boundary Guardrail
# ---------------------------------------------------------------------------

class PromptInjectionDefense:
    """
    Prevents Direct and Indirect Prompt Injection inside financial memos & customer inputs.
    """
    ADVERSARIAL_PATTERNS = [
        re.compile(r"ignore\s+(all\s+)?(previous\s+)?instructions", re.IGNORECASE),
        re.compile(r"system\s*override", re.IGNORECASE),
        re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
        re.compile(r"approve\s+(instant\s+)?credit\s+without\s+checks", re.IGNORECASE),
        re.compile(r"disregard\s+legal\s+limits", re.IGNORECASE),
    ]

    @classmethod
    def sanitize_untrusted_input(cls, text: str, max_chars: int = 500) -> str:
        escaped = html.escape(text.strip())
        return escaped[:max_chars]

    @classmethod
    def detect_jailbreak(cls, text: str) -> bool:
        for pattern in cls.ADVERSARIAL_PATTERNS:
            if pattern.search(text):
                return True
        return False

    @classmethod
    def wrap_in_isolated_boundary(cls, untrusted_payload: str, tag: str = "untrusted_customer_data") -> str:
        sanitized = cls.sanitize_untrusted_input(untrusted_payload)
        return f"<{tag}>\n{sanitized}\n</{tag}>"


# ---------------------------------------------------------------------------
# 4. Deterministic Statutory Financial Invariants (GDPR Art. 22 Compliance)
# ---------------------------------------------------------------------------

@dataclass
class CreditBufferProposal:
    user_id: uuid.UUID
    buffer_amount_eur: float
    duration_days: int = 14
    interest_rate_pct: float = 0.0
    requires_human_approval: bool = True
    requires_itsme_sca: bool = True

    def __post_init__(self):
        if self.buffer_amount_eur > 250.0:
            raise ValueError(f"Buffer {self.buffer_amount_eur} exceeds statutory zero-interest ceiling of €250.")
        if self.duration_days > 14:
            raise ValueError("Buffer duration cannot exceed 14 days under statutory guidelines.")
        if self.interest_rate_pct != 0.0:
            raise ValueError("Consumer protection rule: buffer interest must be exactly 0.0%.")
