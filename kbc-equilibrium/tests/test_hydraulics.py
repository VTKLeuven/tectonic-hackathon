"""
Unit Tests for KBC Equilibrium Financial Hydraulic Solver
=========================================================
Tests the mathematical invariants, European Bancassurance laws, and cashflow projections:
1. Solvency Bounds & Mathematical Invariants
2. Belgian Art. 59 WIB 92 80% Rule Compliance (IPT Pension Advance)
3. Amortization-Coupled Continuous Underwriting (Valve 2 Schuldsaldo)
4. Febelfin Mortgage Moratorium (+€1,200/mo liquidity injection)
5. 90-Day Cashflow Curve Generation & Runway Extension
"""

import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from models.schemas import (
    HydraulicRebalanceRequest,
    HydraulicRebalanceResponse,
    FinancialState,
)
from engine.hydraulics import HydraulicSolver
from engine.scenarios import (
    get_all_scenarios_metadata,
    get_scenario_by_id,
    get_canvas_ast_for_scenario,
)


class TestHydraulicInvariants:
    """Mathematical invariants and solvency verification."""

    def test_scenario_catalog_integrity(self):
        """Verify all 3 Belgian scenarios exist with realistic domain constraints."""
        metadata = get_all_scenarios_metadata()
        assert len(metadata) == 3

        scenario_ids = [m["id"] for m in metadata]
        assert "sme-invoice-crunch-luc" in scenario_ids
        assert "flemish-epc-lucas-camille" in scenario_ids
        assert "burnout-medical-cliff-vincent" in scenario_ids

        # Check Luc De Smet (SME) has corporate IPT and Peppol context
        luc = next(m for m in metadata if m["id"] == "sme-invoice-crunch-luc")
        assert luc["customer_name"] == "Luc De Smet"
        assert "SME" in luc["archetype"]
        assert luc["corporate_ipt_reserves_eur"] == 68000.0

    def test_solvency_bounds_non_negativity(self):
        """Mathematical Invariant: Loan remaining principal and buffers cannot become negative."""
        for scenario_id in ["sme-invoice-crunch-luc", "flemish-epc-lucas-camille", "burnout-medical-cliff-vincent"]:
            state = get_scenario_by_id(scenario_id)
            assert state is not None

            for credit in state.pillar1_banking.active_credits:
                assert credit.remaining_principal_eur >= 0.0
                assert credit.monthly_repayment_eur >= 0.0
                assert credit.interest_rate_pct >= 0.0

            assert state.pillar1_banking.target_emergency_float_eur >= 0.0
            assert state.pillar2_insurance.aggregate_deductibles_eur >= 0.0

    def test_intensity_slider_bounds(self):
        """Mathematical Invariant: Shock absorption factor is strictly bounded between 0.0 and 1.0."""
        # 0% shock absorption (Unmitigated crisis)
        req_0 = HydraulicRebalanceRequest(scenario_id="sme-invoice-crunch-luc", shock_absorption_pct=0.0)
        res_0 = HydraulicSolver.simulate(req_0)
        assert res_0.shock_absorption_pct == 0.0
        assert res_0.valve_3_result.advance_drawn_eur == 0.0
        assert res_0.summary.total_immediate_liquidity_freed_eur == 0.0

        # 50% shock absorption (Partial relief)
        req_50 = HydraulicRebalanceRequest(scenario_id="sme-invoice-crunch-luc", shock_absorption_pct=50.0)
        res_50 = HydraulicSolver.simulate(req_50)
        assert res_50.shock_absorption_pct == 50.0
        assert 0.0 < res_50.valve_3_result.advance_drawn_eur < 12500.0

        # 100% shock absorption (Full shield)
        req_100 = HydraulicRebalanceRequest(scenario_id="sme-invoice-crunch-luc", shock_absorption_pct=100.0)
        res_100 = HydraulicSolver.simulate(req_100)
        assert res_100.shock_absorption_pct == 100.0
        assert res_100.valve_3_result.advance_drawn_eur == 12500.0

        # Monotonicity invariant: Higher shock absorption produces greater or equal liquidity freed
        assert res_100.summary.total_immediate_liquidity_freed_eur >= res_50.summary.total_immediate_liquidity_freed_eur
        assert res_50.summary.total_immediate_liquidity_freed_eur >= res_0.summary.total_immediate_liquidity_freed_eur

    def test_belgian_art_59_wib_92_80_percent_rule_compliance(self):
        """
        Belgian Tax Code Compliance:
        Under Art. 59 WIB 92, an IPT (Individuele Pensioentoezegging) advance
        cannot exceed 80% of the built-up pension reserves.
        """
        req = HydraulicRebalanceRequest(
            scenario_id="sme-invoice-crunch-luc",
            shock_absorption_pct=100.0,
            activate_valve_3_lombard_ipt_advance=True,
        )
        res = HydraulicSolver.simulate(req)

        # Luc has €68,000 in IPT pension reserves
        ipt_reserve = res.valve_3_result.asset_valuation_eur
        assert ipt_reserve == 68000.0

        # Statutory max advance ceiling is exactly 80%
        statutory_cap = ipt_reserve * 0.80
        assert res.valve_3_result.max_statutory_advance_eur == statutory_cap
        assert res.valve_3_result.advance_drawn_eur <= statutory_cap

        # Advance drawn (€12,500) strictly satisfies: €12,500 <= €54,400
        assert res.valve_3_result.advance_drawn_eur == 12500.0
        assert res.valve_3_result.advance_drawn_eur <= res.valve_3_result.max_statutory_advance_eur

        # Tax saving: avoided 30% dividend withholding tax (Roerende voorheffing)
        expected_tax_saving = 12500.0 * 0.30
        assert res.valve_3_result.tax_drag_saved_eur == expected_tax_saving

    def test_valve_1_deductible_calibrated_emergency_float(self):
        """
        Valve 1 Invariant:
        Target Emergency Float = Sum(Pillar 2 Deductibles) + Rolling 60-Day Fixed Outflows.
        Calibrating deductibles frees cash safely into high-yield buffers.
        """
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
        assert res.valve_1_result.adjusted_target_buffer_eur < 12000.0
        assert res.summary.total_immediate_liquidity_freed_eur > 0

    def test_valve_2_continuous_underwriting_schuldsaldo_sync(self):
        """
        Valve 2 Invariant:
        Schuldsaldoverzekering (ASR) death benefit MUST contract synchronously with
        amortized mortgage principal, lowering monthly premiums automatically.
        """
        req = HydraulicRebalanceRequest(
            scenario_id="flemish-epc-lucas-camille",
            shock_absorption_pct=100.0,
            activate_valve_1_buffer_float=False,
            activate_valve_2_amortization_sync=True,
            activate_valve_3_lombard_ipt_advance=False,
            activate_valve_4_mortgage_moratorium=False,
        )
        res = HydraulicSolver.simulate(req)
        # Lucas & Camille amortized from €390k down to €298k
        assert res.valve_2_result.original_insured_amount_eur == 390000.0
        assert res.valve_2_result.recalibrated_insured_amount_eur == 298000.0
        assert res.valve_2_result.recalibrated_insured_amount_eur <= res.valve_2_result.original_insured_amount_eur
        assert res.valve_2_result.monthly_premium_savings_eur > 0.0
        assert res.valve_2_result.annual_savings_eur == pytest.approx(res.valve_2_result.monthly_premium_savings_eur * 12.0, rel=1e-2)

    def test_valve_4_febelfin_mortgage_moratorium(self):
        """
        Valve 4 Invariant:
        Mortgage Moratorium (Kapitaaluitstel) pauses capital repayment for up to 6 months,
        retaining interest payment, providing immediate +€1,200/mo cash injection.
        """
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
        assert res.valve_4_result.moratorium_duration_months == 6
        assert res.valve_4_result.total_liquidity_injected_eur == 1200.0 * 6.0  # €7,200

    def test_90_day_cashflow_curve_and_runway_extension(self):
        """
        Cashflow Invariant:
        At Day 90, hydraulic balance must strictly exceed baseline deficit,
        preventing bankruptcy and extending runway.
        """
        req = HydraulicRebalanceRequest(scenario_id="sme-invoice-crunch-luc", shock_absorption_pct=100.0)
        res = HydraulicSolver.simulate(req)

        cashflows = res.cashflow_projection_90d
        assert len(cashflows) == 91  # Day 0 to Day 90

        # Day 0 starts with same liquid balance
        assert cashflows[0].day == 0

        # Between Day 10 and Day 60, baseline incurs acute VAT & mortgage deficit
        # Hydraulic curve must strictly float above baseline
        baseline_min = min(p.baseline_balance_eur for p in cashflows)
        hydraulic_min = min(p.hydraulic_balance_eur for p in cashflows)
        assert baseline_min < 0.0  # Baseline went into deep overdraft
        assert hydraulic_min >= 0.0  # Hydraulic shield kept account solvent!

        # Runway extension must be positive
        assert res.summary.runway_extension_days > 0
        assert res.summary.post_runway_days > res.summary.pre_runway_days
        assert res.summary.equilibrium_health_score >= 85.0
