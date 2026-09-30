"""
KBC Equilibrium - Security & Sentinel Guard Adapter
===================================================
Seamless bridge to `app/security/sentinel_guard.py` for:
- Belgian Banking Secrecy PII Scrubbing (Rijksregisternummer & IBAN masking)
- Anti-IDOR (Cryptographic Tenancy & Ownership verification)
- Prompt Injection & Boundary Guardrails
- Statutory Financial Invariants (GDPR Art. 22 & PSD2 SCA compliance)
"""

import sys
import os
import json
import hashlib
import uuid
from typing import Dict, Any, Optional

# Ensure repository root is on sys.path to import app.security.sentinel_guard
current_dir = os.path.dirname(os.path.abspath(__file__))
# current_dir is kbc-equilibrium/backend/security
# repo root is 3 levels up
repo_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

try:
    from app.security.sentinel_guard import (
        SecurityContext,
        BelgianBankingPIIScrubber,
        PromptInjectionDefense,
        CreditBufferProposal
    )
except ImportError:
    # Graceful fallback in case path resolution differs in isolated containers
    from dataclasses import dataclass, field
    import re
    import html
    import hmac

    @dataclass
    class SecurityContext:
        user_id: uuid.UUID
        tenant_id: uuid.UUID
        roles: list = field(default_factory=list)
        scopes: list = field(default_factory=list)
        is_authenticated: bool = True

        def can_access_entity(self, entity_owner_id: uuid.UUID, entity_tenant_id: uuid.UUID, required_scope: str) -> bool:
            if not self.is_authenticated:
                return False
            if required_scope not in self.scopes and "admin:all" not in self.roles:
                return False
            return (self.user_id == entity_owner_id) and (self.tenant_id == entity_tenant_id)

    class BelgianBankingPIIScrubber:
        RIJKSREGISTER_PATTERN = re.compile(r"\b(\d{2}[\.\s]?\d{2}[\.\s]?\d{2}[-\s]?\d{3}[\.\s-]?\d{2})\b")
        IBAN_PATTERN = re.compile(r"\b(BE\d{2}[\s]?(?:\d{4}[\s]?){3})\b", re.IGNORECASE)

        def __init__(self, telemetry_salt: str = "kbc-sentinel-2026-salt"):
            self.salt = telemetry_salt.encode("utf-8")

        def mask_text(self, text: str) -> str:
            masked = self.RIJKSREGISTER_PATTERN.sub("[MASKED_BELGIAN_SSN]", text)
            masked = self.IBAN_PATTERN.sub("[MASKED_BE_IBAN]", masked)
            return masked

        def hmac_pseudonymize(self, raw_id: str) -> str:
            return hmac.new(self.salt, raw_id.encode("utf-8"), hashlib.sha256).hexdigest()[:16]

    class PromptInjectionDefense:
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

    @dataclass
    class CreditBufferProposal:
        user_id: uuid.UUID
        buffer_amount_eur: float
        duration_days: int = 14
        interest_rate_pct: float = 0.0
        requires_human_approval: bool = True
        requires_itsme_sca: bool = True


# Initialize singleton scrubber with KBC Bancassurance salt
scrubber = BelgianBankingPIIScrubber(telemetry_salt="kbc-equilibrium-tri-pillar-salt-2026")


def mask_pii_string(value: str) -> str:
    """Mask Belgian SSN and IBAN from strings."""
    if not value:
        return value
    return scrubber.mask_text(str(value))


def mask_dict_pii(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively scrub PII from dictionary values."""
    sanitized = {}
    for k, v in data.items():
        if isinstance(v, str):
            sanitized[k] = scrubber.mask_text(v)
        elif isinstance(v, dict):
            sanitized[k] = mask_dict_pii(v)
        elif isinstance(v, list):
            sanitized[k] = [mask_dict_pii(i) if isinstance(i, dict) else (scrubber.mask_text(str(i)) if isinstance(i, str) else i) for i in v]
        else:
            sanitized[k] = v
    return sanitized


def compute_state_hash(payload: Dict[str, Any]) -> str:
    """Compute deterministic SHA-256 fingerprint for audit and FSMA compliance."""
    canonical_json = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()
