"""
End-to-End API Integration Tests for KBC Equilibrium
====================================================
Tests all REST endpoints across the full FastAPI application:
- /api/health
- /api/scenarios (list all)
- /api/scenarios/{scenario_id} (get detail & telemetry)
- /api/hydraulics/simulate (slider rebalance engine)
- /api/execute-sca (Itsme® biometric execution & atomic commit)
- /api/canvas/{scenario_id} (Declarative GenUI Canvas AST)
- /api/audit-logs (FSMA / Aikido regulatory audit trail)
- /api/voice/synthesize (ElevenLabs & offline speech audio)
- /api/voice/scripts/{scenario_id} (scenario conversational scripts)
- /api/agent/chat (cognitive turn with speech synthesis)
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestKBCHealthEndpoint:
    """System health check and diagnostic inspection."""

    def test_health_check_returns_operational_status(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"].lower() == "healthy"
        assert "KBC" in data["service"] or "kbc" in data["service"].lower()


class TestScenarioEndpoints:
    """Scenario catalog and initial financial state retrieval."""

    def test_list_all_scenarios(self):
        res = client.get("/api/scenarios")
        assert res.status_code == 200
        scenarios = res.json()
        assert isinstance(scenarios, list)
        assert len(scenarios) == 3

        ids = [s["id"] for s in scenarios]
        assert "sme-invoice-crunch-luc" in ids
        assert "flemish-epc-lucas-camille" in ids
        assert "burnout-medical-cliff-vincent" in ids

    def test_get_scenario_by_id_luc_sme(self):
        res = client.get("/api/scenarios/sme-invoice-crunch-luc")
        assert res.status_code == 200
        data = res.json()

        assert data["profile"]["customer_id"] == "sme-invoice-crunch-luc"
        assert data["profile"]["role_type"] == "SME_FREELANCER"
        assert "[MASKED_BELGIAN_SSN]" in data["profile"]["masked_ssn"]
        assert "[MASKED_BE_IBAN]" in data["profile"]["masked_iban"]

        # 90-day cashflows present
        assert len(data["daily_cashflows"]) == 91
        assert data["state_hash"] is not None

    def test_get_scenario_by_id_not_found(self):
        res = client.get("/api/scenarios/non-existent-scenario-999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


class TestHydraulicSimulationEndpoint:
    """Live hydraulic rebalancing solver endpoint."""

    def test_simulate_full_shield_100_percent(self):
        payload = {
            "scenario_id": "sme-invoice-crunch-luc",
            "shock_absorption_pct": 100.0,
            "activate_valve_1_buffer_float": True,
            "activate_valve_2_amortization_sync": True,
            "activate_valve_3_lombard_ipt_advance": True,
            "activate_valve_4_mortgage_moratorium": False,
        }
        res = client.post("/api/hydraulics/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["scenario_id"] == "sme-invoice-crunch-luc"
        assert data["shock_absorption_pct"] == 100.0
        assert data["valve_3_result"]["advance_drawn_eur"] == 12500.0
        assert data["summary"]["runway_extension_days"] > 0
        assert data["summary"]["equilibrium_health_score"] >= 80.0
        assert len(data["cashflow_projection_90d"]) == 91
        assert data["audit_hash"] is not None

    def test_simulate_zero_percent_baseline(self):
        payload = {
            "scenario_id": "flemish-epc-lucas-camille",
            "shock_absorption_pct": 0.0,
        }
        res = client.post("/api/hydraulics/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["shock_absorption_pct"] == 0.0
        assert data["summary"]["total_immediate_liquidity_freed_eur"] == 0.0

    def test_simulate_invalid_intensity_slider(self):
        payload = {
            "scenario_id": "sme-invoice-crunch-luc",
            "shock_absorption_pct": 150.0,  # Invalid: max 100.0
        }
        res = client.post("/api/hydraulics/simulate", json=payload)
        assert res.status_code == 422  # Pydantic validation error


class TestItsmeSCAExecutionEndpoint:
    """Belgian Itsme® biometric authorization and atomic commit."""

    def test_execute_itsme_sca_atomic_commit(self):
        sca_payload = {
            "scenario_id": "sme-invoice-crunch-luc",
            "rebalance_payload": {
                "scenario_id": "sme-invoice-crunch-luc",
                "shock_absorption_pct": 100.0,
                "activate_valve_1_buffer_float": True,
                "activate_valve_2_amortization_sync": True,
                "activate_valve_3_lombard_ipt_advance": True,
                "activate_valve_4_mortgage_moratorium": False,
            },
            "customer_action": "AUTHORIZE_TRI_PILLAR_HYDRAULIC_REBALANCE",
            "phone_or_identity_token": "+32470998877",
            "totp_or_biometric_assertion": "ITSME_BIOMETRIC_ASSERTION_OK",
        }
        res = client.post("/api/execute-sca", json=sca_payload)
        assert res.status_code == 200
        data = res.json()

        assert data["itsme_status"] == "SUCCESS"
        assert data["itsme_assurance_level"] == "HIGH_EIDAS"
        assert data["atomic_commit_executed"] is True
        assert data["transaction_id"].startswith("ITSME-TX-")
        assert len(data["signed_hash"]) == 64  # SHA-256 state hash

    def test_audit_log_recorded_after_sca(self):
        res = client.get("/api/audit-logs")
        assert res.status_code == 200
        logs = res.json()
        assert isinstance(logs, list)
        assert len(logs) >= 1

        last_log = logs[-1]
        assert "PSD2 RTS" in " ".join(last_log["regulatory_frameworks"])
        assert last_log["tenant_id"] == "kbc-belgium-production"
        assert len(last_log["state_hash"]) == 64


class TestGenUICanvasASTEndpoint:
    """Declarative GenUI Canvas AST delivery."""

    def test_get_canvas_ast_luc_sme(self):
        res = client.get("/api/canvas/sme-invoice-crunch-luc")
        assert res.status_code == 200
        data = res.json()

        assert data["scenario_id"] == "sme-invoice-crunch-luc"
        assert data["template"] == "dual_life_bridge_canvas"
        assert len(data["widgets"]) >= 3

        widget_ids = [w["component_id"] for w in data["widgets"]]
        assert "KBC_Hydraulic_Pressure_Gauge" in widget_ids
        assert "KBC_TimeTravel_Horizon" in widget_ids


class TestVoiceAndAgentEndpoints:
    """Voice synthesis, scripts, and cognitive conversational turn."""

    def test_voice_synthesize_endpoint(self):
        payload = {
            "text": "Luc, take a deep breath. Your mortgage is safe.",
            "persona": "liesbeth",
            "tone_modifier": "reassuring"
        }
        res = client.post("/api/voice/synthesize", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "audio_base64" in data
        assert len(data["audio_base64"]) > 0
        assert data["persona_id"] == "liesbeth"

    def test_voice_scenario_script_endpoint(self):
        res = client.get("/api/voice/scripts/sme_cashflow")
        assert res.status_code == 200
        data = res.json()
        assert "title" in data
        assert len(data.get("steps", [])) >= 1

    def test_agent_chat_turn(self):
        payload = {
            "message": "My invoice is delayed and my VAT is due Monday!",
            "context": {"scenario_id": "sme-invoice-crunch-luc"},
            "synthesize_audio": True,
            "preferred_persona": "liesbeth"
        }
        res = client.post("/api/agent/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "detected_intent" in data
        assert "spoken_response_nl" in data
        assert "audio_synthesis" in data
        assert "audio_base64" in data["audio_synthesis"]
