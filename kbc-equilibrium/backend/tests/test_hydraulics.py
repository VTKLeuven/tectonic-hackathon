"""
Unit and Integration Tests for KBC Equilibrium Hydraulic Engine
==============================================================
Tests the deterministic 4-Valve Bancassurance Solvers:
- Valve 1: Dynamic Float vs Deductibles
- Valve 2: Schuldsaldo Continuous Underwriting
- Valve 3: Belgian Art. 59 WIB 92 80% Rule & Lombard Advance
- Valve 4: Febelfin Mortgage Moratorium (+€1,200/mo)
- 90-Day Cashflow Runway Projections
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models.schemas import (
    HydraulicRebalanceRequest,
    HydraulicRebalanceResponse,
)
from engine.hydraulics import HydraulicSolver
from engine.scenarios import (
    get_all_scenarios_metadata,
    get_scenario_by_id,
    get_canvas_ast_for_scenario,
)


def test_scenario_catalog():
    """Verify all 3 Belgian scenarios are populated with deep domain attributes."""
    metadata = get_all_scenarios_metadata()
    assert len(metadata) == 3

    ids = [m["id"] for m in metadata]
    assert "sme-invoice-crunch-luc" in ids
    assert "flemish-epc-lucas-camille" in ids
    assert "burnout-medical-cliff-vincent" in ids

    # Check Luc De Smet (SME)
    luc_meta = next(m for m in metadata if m["id"] == "sme-invoice-crunch-luc")
    assert luc_meta["customer_name"] == "Luc De Smet"
    assert luc_meta["corporate_ipt_reserves_eur"] == 68000.0
    assert "Art. 59 WIB 92" in luc_meta["statutory_context"]


def test_scenario_initial_states():
    """Verify initial financial states load with correct tri-pillar data."""
    for s_id in ["sme-invoice-crunch-luc", "flemish-epc-lucas-camille", "burnout-medical-cliff-vincent"]:
        state = get_scenario_by_id(s_id)
        assert state is not None
        assert state.profile.customer_id == s_id
        assert state.pillar1_banking.liquid_current_eur > 0
        assert len(state.daily_cashflows) == 91
        assert state.state_hash is not None


def test_valve_1_dynamic_liquidity_float():
    """Test Valve 1: Dynamic Liquidity Buffer vs Insurance Deductibles."""
    req = HydraulicRebalanceRequest(
        scenario_id="flemish-epc-lucas-camille",
        shock_absorption_pct=100.0,
        activate_valve_1_buffer_float=True,
        activate_valve_2_amortization_sync=False,
        activate_valve_3_lombard_ipt_advance=False,
        activate_valve_4_mortgage_moratorium=False,
    )
    res = HydraulicSolver.simulate(req)
    assert res.valve_1_result.freed_liquidity_eur > 0
    assert res.valve_1_result.adjusted_target_buffer_eur < 12000.0  # Original was 12k
    assert "Calibrated liquid emergency float" in res.valve_1_result.explanation


def test_valve_2_schuldsaldo_continuous_underwriting():
    """Test Valve 2: Schuldsaldo contracts in lockstep with amortized principal."""
    req = HydraulicRebalanceRequest(
        scenario_id="flemish-epc-lucas-camille",
        shock_absorption_pct=100.0,
        activate_valve_1_buffer_float=False,
        activate_valve_2_amortization_sync=True,
        activate_valve_3_lombard_ipt_advance=False,
        activate_valve_4_mortgage_moratorium=False,
    )
    res = HydraulicSolver.simulate(req)
    # Original insured was €390,000, current principal is €298,000
    assert res.valve_2_result.original_insured_amount_eur == 390000.0
    assert res.valve_2_result.recalibrated_insured_amount_eur == 298000.0
    assert res.valve_2_result.monthly_premium_savings_eur > 0
    assert res.valve_2_result.annual_savings_eur > 0


def test_valve_3_ipt_advance_luc_smet():
    """Test Valve 3: Luc De Smet IPT Pension Advance under Art. 59 WIB 92."""
    req = HydraulicRebalanceRequest(
        scenario_id="sme-invoice-crunch-luc",
        shock_absorption_pct=100.0,
        activate_valve_1_buffer_float=False,
        activate_valve_2_amortization_sync=False,
        activate_valve_3_lombard_ipt_advance=True,
        activate_valve_4_mortgage_moratorium=False,
    )
    res = HydraulicSolver.simulate(req)
    assert res.valve_3_result.pledged_asset_type == "IPT_PENSION_ART_59"
    assert res.valve_3_result.asset_valuation_eur == 68000.0
    assert res.valve_3_result.max_statutory_advance_eur == 68000.0 * 0.80  # €54,400
    assert res.valve_3_result.advance_drawn_eur == 12500.0
    assert res.valve_3_result.tax_drag_saved_eur == 12500.0 * 0.30  # €3,750 dividend tax saved
    assert res.summary.runway_extension_days > 30


def test_valve_3_lombard_pledge_lucas_camille():
    """Test Valve 3: Lucas & Camille Bolero fund pledge avoiding TOB stock exchange tax."""
    req = HydraulicRebalanceRequest(
        scenario_id="flemish-epc-lucas-camille",
        shock_absorption_pct=100.0,
        activate_valve_1_buffer_float=False,
        activate_valve_2_amortization_sync=False,
        activate_valve_3_lombard_ipt_advance=True,
        activate_valve_4_mortgage_moratorium=False,
    )
    res = HydraulicSolver.simulate(req)
    assert res.valve_3_result.pledged_asset_type == "BOLERO_INVESTMENT_FUNDS"
    assert res.valve_3_result.advance_drawn_eur == 15000.0
    assert res.valve_3_result.tax_drag_saved_eur > 0  # Avoided TOB


def test_valve_4_mortgage_moratorium_vincent():
    """Test Valve 4: Vincent's +€1,200/mo mortgage capital repayment moratorium."""
    req = HydraulicRebalanceRequest(
        scenario_id="burnout-medical-cliff-vincent",
        shock_absorption_pct=100.0,
        activate_valve_1_buffer_float=True,
        activate_valve_2_amortization_sync=True,
        activate_valve_3_lombard_ipt_advance=True,
        activate_valve_4_mortgage_moratorium=True,
    )
    res = HydraulicSolver.simulate(req)
    assert res.valve_4_result.moratorium_activated is True
    assert res.valve_4_result.capital_repayment_paused_eur_per_month == 1200.0
    assert res.valve_4_result.interest_only_monthly_payment_eur == 250.0
    assert res.valve_4_result.total_liquidity_injected_eur == 1200.0 * 6.0  # €7,200 total relief
    # Vincent's post runway should safely extend past Day 31 cliff
    assert res.summary.post_runway_days >= 90.0


def test_declarative_canvas_ast():
    """Test GenUI Declarative Canvas AST synthesis for frontend."""
    for s_id in ["sme-invoice-crunch-luc", "flemish-epc-lucas-camille", "burnout-medical-cliff-vincent"]:
        ast = get_canvas_ast_for_scenario(s_id)
        assert ast.schema_version == "https://kbc.com/schemas/genui/canvas-v2.json"
        assert ast.scenario_id == s_id
        assert len(ast.widgets) >= 2
        for w in ast.widgets:
            assert w.component_id.startswith("KBC_")
            assert isinstance(w.props, dict)
            assert w.slot in ["primary_stage", "secondary_stage", "telemetry_sidebar", "footer_action", "horizon_scrubber"]
