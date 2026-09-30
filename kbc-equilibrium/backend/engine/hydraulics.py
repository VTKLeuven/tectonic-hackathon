"""
KBC Equilibrium - Hydraulic Financial Solver
============================================
Deterministic cross-pillar mathematical engine simulating the 4 Belgian Bancassurance Valves:
- Valve 1: Dynamic Liquidity Buffer vs Insurance Deductibles (Pressure Float)
- Valve 2: Amortization-Coupled Insurance Continuous Underwriting (Schuldsaldoverzekering Sync)
- Valve 3: Asset-Backed Lombard / IPT Pension Advance (Belgian Art. 59 WIB 92 80% Rule)
- Valve 4: Mortgage Principal Moratorium (Kapitaaluitstel, +€1,200/mo liquidity injection)

Includes 90-day cashflow simulation and Aikido/FSMA cryptographic state hashing.
"""

from typing import List, Optional
from datetime import datetime, timedelta
import copy

from models.schemas import (
    FinancialState,
    HydraulicRebalanceRequest,
    HydraulicRebalanceResponse,
    Valve1Result,
    Valve2Result,
    Valve3Result,
    Valve4Result,
    HydraulicSummary,
    DailyCashflowPoint,
)
from engine.scenarios import get_scenario_by_id
from security.sentinel_adapter import compute_state_hash


class HydraulicSolver:
    """
    Deterministic solver executing continuous bancassurance equilibrium.
    Operates without statistical hallucinations or floating-point drift.
    """

    @classmethod
    def simulate(cls, request: HydraulicRebalanceRequest) -> HydraulicRebalanceResponse:
        state: Optional[FinancialState] = get_scenario_by_id(request.scenario_id)
        if not state:
            raise ValueError(f"Scenario ID '{request.scenario_id}' not found in registry.")

        # Intensity factor from slider: 0.0 to 1.0
        intensity = max(0.0, min(100.0, request.shock_absorption_pct)) / 100.0

        # ---------------------------------------------------------------------
        # VALVE 1: DYNAMIC LIQUIDITY BUFFER VS INSURANCE DEDUCTIBLES
        # ---------------------------------------------------------------------
        # Formula: Target Float = Sum(Pillar 2 Deductibles) + Rolling 60-Day Fixed Outflows
        p1 = state.pillar1_banking
        p2 = state.pillar2_insurance
        p3 = state.pillar3_wealth

        aggregate_deductible = p2.aggregate_deductibles_eur
        rolling_60d_outflows = (p1.monthly_fixed_outflows_eur / 30.0) * 60.0
        statutory_target_float = aggregate_deductible + rolling_60d_outflows

        if request.activate_valve_1_buffer_float and intensity > 0.0:
            # Under dynamic pressure calibration, we optimize deductible sizing
            # and calibrate the required buffer to eliminate idle cash drag
            deductible_delta = -150.0 * intensity
            monthly_premium_delta = 12.50 * intensity  # Slightly higher deductible saves monthly premium
            adjusted_target_buffer = statutory_target_float + (deductible_delta * 0.8)
            freed_liquidity_valve1 = max(0.0, (p1.target_emergency_float_eur - adjusted_target_buffer) * intensity)
            v1_explanation = (
                f"Calibrated liquid emergency float from €{p1.target_emergency_float_eur:,.2f} "
                f"down to €{adjusted_target_buffer:,.2f} by mathematically indexing cash reserves directly to "
                f"Pillar 2 aggregate policy deductibles (€{aggregate_deductible:,.2f}) and rolling 60-day obligations. "
                f"Liberated €{freed_liquidity_valve1:,.2f} in dormant cash."
            )
        else:
            adjusted_target_buffer = p1.target_emergency_float_eur
            freed_liquidity_valve1 = 0.0
            deductible_delta = 0.0
            monthly_premium_delta = 0.0
            v1_explanation = "Valve 1 inactive: static emergency float maintained."

        valve_1 = Valve1Result(
            adjusted_target_buffer_eur=round(adjusted_target_buffer, 2),
            freed_liquidity_eur=round(freed_liquidity_valve1, 2),
            deductible_delta_eur=round(deductible_delta, 2),
            monthly_premium_delta_eur=round(monthly_premium_delta, 2),
            explanation=v1_explanation,
        )

        # ---------------------------------------------------------------------
        # VALVE 2: AMORTIZATION-COUPLED INSURANCE DISCOUNT (SCHULDSALDO)
        # ---------------------------------------------------------------------
        # Outstanding Balance Life Insurance continuously synchronized with remaining principal
        schuldsaldo = p2.schuldsaldo
        v2_orig_insured = schuldsaldo.insured_amount_eur if schuldsaldo else 0.0
        v2_current_principal = p1.active_credits[0].remaining_principal_eur if p1.active_credits else 0.0
        v2_monthly_savings = 0.0
        v2_annual_savings = 0.0
        v2_recalibrated_insured = v2_orig_insured

        if schuldsaldo and request.activate_valve_2_amortization_sync and intensity > 0.0:
            v2_recalibrated_insured = v2_current_principal
            ratio = (v2_current_principal / v2_orig_insured) if v2_orig_insured > 0 else 1.0
            ratio = max(0.2, min(1.0, ratio))

            base_monthly_savings = schuldsaldo.monthly_premium_eur * (1.0 - ratio)

            # Eco-discount bonus for EPC renovations if under renovation
            eco_bonus = 15.0 if p2.fire_home and p2.fire_home.under_renovation else 0.0
            v2_monthly_savings = (base_monthly_savings + eco_bonus) * intensity
            v2_annual_savings = v2_monthly_savings * 12.0

            v2_explanation = (
                f"Continuous Underwriting Engine contracted death-benefit sum from €{v2_orig_insured:,.2f} "
                f"to exact remaining principal of €{v2_recalibrated_insured:,.2f}. "
                f"Schuldsaldoverzekering premium reduced by €{v2_monthly_savings:,.2f}/month "
                f"(€{v2_annual_savings:,.2f}/year freed cashflow)."
            )
        else:
            v2_explanation = "Valve 2 inactive: static term-life premium maintained."

        valve_2 = Valve2Result(
            current_mortgage_principal_eur=round(v2_current_principal, 2),
            original_insured_amount_eur=round(v2_orig_insured, 2),
            recalibrated_insured_amount_eur=round(v2_recalibrated_insured, 2),
            monthly_premium_savings_eur=round(v2_monthly_savings, 2),
            annual_savings_eur=round(v2_annual_savings, 2),
            explanation=v2_explanation,
        )

        # ---------------------------------------------------------------------
        # VALVE 3: ASSET-BACKED LOMBARD / IPT PENSION ADVANCE (ART. 59 WIB 92)
        # ---------------------------------------------------------------------
        # Anti-Liquidation Valve: Pledging corporate IPT reserve or retail funds
        pledged_type = "NONE"
        asset_valuation = 0.0
        max_advance = 0.0
        advance_drawn = 0.0
        interest_rate = 0.0
        tax_saved = 0.0

        if request.activate_valve_3_lombard_ipt_advance and intensity > 0.0:
            if p3.corporate_ipt_reserves_eur > 0:
                # Belgian Art. 59 WIB 92 80% Rule Corporate IPT Pension Advance
                pledged_type = "IPT_PENSION_ART_59"
                asset_valuation = p3.corporate_ipt_reserves_eur
                max_advance = p3.corporate_ipt_reserves_eur * 0.80  # Statutory 80% cap
                # Needed to bridge VAT €4.1k + mortgage €1.92k + working capital = €12,500
                target_need = 12500.0
                advance_drawn = min(max_advance, target_need * intensity)
                interest_rate = 2.20
                # Saved corporate dividend withholding tax (30% vs 15% VVPR-bis or 0% advance):
                tax_saved = advance_drawn * 0.30
                v3_explanation = (
                    f"Activated Belgian Art. 59 WIB 92 statutory advance against corporate IPT pension reserve "
                    f"(€{asset_valuation:,.2f}). Granted instant tax-free liquidity injection of €{advance_drawn:,.2f} "
                    f"at 2.2% interest. Zero stock liquidation, zero dividend withholding tax drag "
                    f"(saved €{tax_saved:,.2f} in fiscal friction)."
                )
            elif p3.kbc_investment_funds_eur > 0:
                # Retail Lombard Credit line backed by Bolero / Horizon funds
                pledged_type = "BOLERO_INVESTMENT_FUNDS"
                asset_valuation = p3.kbc_investment_funds_eur
                max_advance = p3.kbc_investment_funds_eur * 0.75  # 75% LTV
                target_need = 15000.0  # Notary duty & architect retainer
                advance_drawn = min(max_advance, target_need * intensity)
                interest_rate = 2.40
                # Saved Belgian Stock Exchange Tax (TOB) 1.32% + avoided selling at market bid
                tax_saved = advance_drawn * 0.0132 + 350.0
                v3_explanation = (
                    f"Activated KBC Asset-Pledged Lombard facility on Bolero/Horizon funds (€{asset_valuation:,.2f}). "
                    f"Approved €{advance_drawn:,.2f} notary buffer at 2.4% rate. 100% of ETF compounding remains intact; "
                    f"avoided Belgian TOB tax and liquidation loss (€{tax_saved:,.2f} saved)."
                )
            else:
                v3_explanation = "No eligible Pillar 3 assets found for Lombard / IPT pledge."
        else:
            v3_explanation = "Valve 3 inactive: no asset-backed advance drawn."

        valve_3 = Valve3Result(
            pledged_asset_type=pledged_type,  # type: ignore
            asset_valuation_eur=round(asset_valuation, 2),
            max_statutory_advance_eur=round(max_advance, 2),
            advance_drawn_eur=round(advance_drawn, 2),
            interest_rate_pct=interest_rate,
            tax_drag_saved_eur=round(tax_saved, 2),
            explanation=v3_explanation,
        )

        # ---------------------------------------------------------------------
        # VALVE 4: MORTGAGE PRINCIPAL MORATORIUM (KAPITAALUITSTEL)
        # ---------------------------------------------------------------------
        # Automatic capital repayment pause (+€1,200/mo liquidity injection)
        # Triggered either explicitly or in critical health/cliff scenarios
        moratorium_active = False
        capital_paused_pm = 0.0
        interest_only_payment = 0.0
        moratorium_months = 0
        total_moratorium_relief = 0.0

        # Auto-activate for Vincent or when requested
        is_cliff_scenario = (request.scenario_id == "burnout-medical-cliff-vincent")
        should_activate_valve_4 = (request.activate_valve_4_mortgage_moratorium or (is_cliff_scenario and intensity > 0.3))

        if should_activate_valve_4 and p1.active_credits:
            primary_credit = p1.active_credits[0]
            if primary_credit.moratorium_eligible:
                moratorium_active = True
                moratorium_months = primary_credit.moratorium_months_allowed
                capital_paused_pm = primary_credit.capital_component_eur * intensity
                interest_only_payment = primary_credit.monthly_repayment_eur - capital_paused_pm
                total_moratorium_relief = capital_paused_pm * moratorium_months
                v4_explanation = (
                    f"Febelfin Mortgage Moratorium Charter activated: paused €{capital_paused_pm:,.2f}/month in capital "
                    f"amortization for {moratorium_months} months. Monthly payment dropped to interest-only "
                    f"(€{interest_only_payment:,.2f}), injecting +€{capital_paused_pm:,.2f}/mo "
                    f"(total €{total_moratorium_relief:,.2f} liquidity bridge)."
                )
            else:
                v4_explanation = "Credit facility is not eligible for principal moratorium."
        else:
            if p1.active_credits:
                interest_only_payment = p1.active_credits[0].monthly_repayment_eur
            v4_explanation = "Valve 4 inactive: regular mortgage capital amortization continues."

        valve_4 = Valve4Result(
            moratorium_activated=moratorium_active,
            capital_repayment_paused_eur_per_month=round(capital_paused_pm, 2),
            interest_only_monthly_payment_eur=round(interest_only_payment, 2),
            moratorium_duration_months=moratorium_months,
            total_liquidity_injected_eur=round(total_moratorium_relief, 2),
            explanation=v4_explanation,
        )

        # ---------------------------------------------------------------------
        # 90-DAY CASHFLOW PROJECTION AFTER HYDRAULIC ADJUSTMENT
        # ---------------------------------------------------------------------
        new_daily_cashflow: List[DailyCashflowPoint] = []
        immediate_liquidity_injection = advance_drawn + freed_liquidity_valve1
        running_hydraulic_balance = p1.liquid_current_eur + p1.savings_buffer_eur + immediate_liquidity_injection

        for point in state.daily_cashflows:
            d = point.day
            day_hydraulic = point.baseline_balance_eur + immediate_liquidity_injection

            # Apply monthly savings from Valve 2
            accumulated_v2_savings = (v2_monthly_savings / 30.0) * d
            day_hydraulic += accumulated_v2_savings

            # Apply mortgage moratorium relief from Valve 4
            if moratorium_active:
                accumulated_v4_relief = (capital_paused_pm / 30.0) * d
                day_hydraulic += accumulated_v4_relief

            # For Vincent: also add Guaranteed Income policy payout (+€1,600/mo after Day 30)
            if request.scenario_id == "burnout-medical-cliff-vincent" and d > 30 and intensity > 0.0:
                days_post_cliff = d - 30
                gi_payout = (1600.0 / 30.0) * days_post_cliff * intensity
                day_hydraulic += gi_payout

            # For Lucas & Camille: Mijn VerbouwPremie sweep on Day 80
            if request.scenario_id == "flemish-epc-lucas-camille" and d >= 80 and intensity > 0.0:
                # Optimized sweep: avoids debt interest
                day_hydraulic += 8400.0 * 0.15 * intensity

            new_daily_cashflow.append(
                DailyCashflowPoint(
                    day=d,
                    date_offset_str=point.date_offset_str,
                    baseline_balance_eur=point.baseline_balance_eur,
                    hydraulic_balance_eur=round(day_hydraulic, 2),
                    event_note=point.event_note,
                )
            )

        # Compute runway extension
        pre_runway = state.runway_days_pre_intervention
        post_runway = 90.0
        for pt in new_daily_cashflow:
            if pt.hydraulic_balance_eur < 0:
                post_runway = float(pt.day)
                break

        runway_extension = int(max(0.0, post_runway - pre_runway))
        monthly_improvement = v2_monthly_savings + capital_paused_pm
        if request.scenario_id == "burnout-medical-cliff-vincent" and intensity > 0.0:
            monthly_improvement += 1600.0 * intensity  # Guaranteed Income payout

        # Equilibrium health score computation (0 - 100)
        base_score = 40.0
        score = base_score + (intensity * 48.0) + (min(post_runway, 90.0) / 90.0 * 12.0)
        health_score = min(98.5, max(15.0, score))

        summary = HydraulicSummary(
            total_immediate_liquidity_freed_eur=round(immediate_liquidity_injection, 2),
            monthly_cashflow_improvement_eur=round(monthly_improvement, 2),
            runway_extension_days=runway_extension,
            pre_runway_days=round(pre_runway, 1),
            post_runway_days=round(post_runway, 1),
            equilibrium_health_score=round(health_score, 1),
            fiscal_drag_prevented_eur=round(tax_saved, 2),
        )

        # Update financial state snapshot
        updated_state = copy.deepcopy(state)
        updated_state.pillar1_banking.liquid_current_eur += immediate_liquidity_injection
        updated_state.pillar1_banking.target_emergency_float_eur = adjusted_target_buffer
        if schuldsaldo and v2_recalibrated_insured > 0:
            updated_state.pillar2_insurance.schuldsaldo.insured_amount_eur = v2_recalibrated_insured
            updated_state.pillar2_insurance.schuldsaldo.monthly_premium_eur -= v2_monthly_savings
            updated_state.pillar2_insurance.schuldsaldo.synced_with_principal = True

        updated_state.daily_cashflows = new_daily_cashflow
        updated_state.runway_days_pre_intervention = post_runway

        audit_payload = {
            "scenario_id": request.scenario_id,
            "shock_absorption_pct": request.shock_absorption_pct,
            "immediate_freed": immediate_liquidity_injection,
            "monthly_improvement": monthly_improvement,
            "runway_extension": runway_extension,
            "health_score": health_score,
            "timestamp": datetime.utcnow().isoformat(),
        }
        audit_hash = compute_state_hash(audit_payload)
        updated_state.state_hash = audit_hash

        return HydraulicRebalanceResponse(
            scenario_id=request.scenario_id,
            shock_absorption_pct=request.shock_absorption_pct,
            valve_1_result=valve_1,
            valve_2_result=valve_2,
            valve_3_result=valve_3,
            valve_4_result=valve_4,
            summary=summary,
            cashflow_projection_90d=new_daily_cashflow,
            updated_financial_state=updated_state,
            audit_hash=audit_hash,
        )
