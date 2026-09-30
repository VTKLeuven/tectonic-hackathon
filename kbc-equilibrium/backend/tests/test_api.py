"""
API and Integration Tests for KBC Equilibrium REST Service
==========================================================
Verifies:
- GET /api/health & GET /health
- GET /api/scenarios & GET /api/scenarios/{id}
- POST /api/hydraulics/simulate
- POST /api/execute-sca
- GET /api/canvas/{scenario_id}
- GET /api/audit-logs
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"].lower() == "healthy"
    assert len(data["valves_active"]) == 4


def test_list_scenarios():
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 3
    names = [s["customer_name"] for s in scenarios]
    assert "Luc De Smet" in names
    assert "Lucas & Camille Vandevelde" in names
    assert "Vincent Van Dijck" in names


def test_get_scenario_detail():
    res = client.get("/api/scenarios/sme-invoice-crunch-luc")
    assert res.status_code == 200
    data = res.json()
    assert data["profile"]["name"] == "Luc De Smet"
    assert data["profile"]["role_type"] == "SME_FREELANCER"
    assert data["pillar3_wealth"]["corporate_ipt_reserves_eur"] == 68000.0


def test_simulate_endpoint():
    payload = {
        "scenario_id": "sme-invoice-crunch-luc",
        "shock_absorption_pct": 80.0,
        "activate_valve_1_buffer_float": True,
        "activate_valve_2_amortization_sync": True,
        "activate_valve_3_lombard_ipt_advance": True,
        "activate_valve_4_mortgage_moratorium": False,
    }
    res = client.post("/api/hydraulics/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_id"] == "sme-invoice-crunch-luc"
    assert data["summary"]["total_immediate_liquidity_freed_eur"] > 0
    assert data["summary"]["equilibrium_health_score"] > 50.0
    assert data["audit_hash"] is not None
    assert len(data["cashflow_projection_90d"]) == 91


def test_execute_itsme_sca_and_audit_trail():
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
    assert data["signed_hash"] is not None
    assert data["audit_record_id"].startswith("AUDIT-FSMA-")

    # Verify audit logs record exists
    logs_res = client.get("/api/audit-logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 1
    recent = logs[-1]
    assert recent["action_type"] == "ATOMIC_TRI_PILLAR_HYDRAULIC_EXECUTION"
    assert "PSD2 RTS (Strong Customer Authentication)" in recent["regulatory_frameworks"]


def test_get_canvas_endpoint():
    res = client.get("/api/canvas/flemish-epc-lucas-camille")
    assert res.status_code == 200
    data = res.json()
    assert data["canvas_id"] == "canvas_epc_bertem_401"
    assert data["template"] == "split_simulation_canvas"
    assert len(data["widgets"]) >= 2
