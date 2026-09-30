"""
KBC Equilibrium - Realistic Belgian Bancassurance Scenarios
===========================================================
Deep statutory domain models reflecting actual Belgian fiscal, social security,
and mortgage laws:
- Scenario 1: SME Invoice Crunch (Luc De Smet, Ghent - Tech BV/SRL)
- Scenario 2: Flemish EPC Homebuyer (Lucas & Camille, Bertem)
- Scenario 3: Acute Burnout / Medical Cliff (Vincent, Antwerp - PC 226)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from models.schemas import (
    CustomerProfile,
    FinancialState,
    Pillar1Banking,
    Pillar2Insurance,
    Pillar3Wealth,
    CreditFacility,
    SchuldsaldoPolicy,
    FireHomePolicy,
    HospitalizationPolicy,
    GuaranteedIncomePolicy,
    DailyCashflowPoint,
    GenUICanvasAST,
    CanvasWidgetNode,
)
from security.sentinel_adapter import compute_state_hash


def _generate_baseline_daily_cashflow(
    initial_liquid: float,
    scenario_id: str
) -> List[DailyCashflowPoint]:
    """Generates deterministic 90-day baseline runway before hydraulic intervention."""
    points: List[DailyCashflowPoint] = []
    current_balance = initial_liquid
    base_date = datetime(2026, 10, 1)

    for day in range(91):
        date_str = (base_date + timedelta(days=day)).strftime("%Y-%m-%d")
        event_note: Optional[str] = None

        if scenario_id == "sme-invoice-crunch-luc":
            # Day 3: Mortgage debit €1,920
            if day == 3:
                current_balance -= 1920.0
                event_note = "Scheduled Mortgage Debit (-€1,920)"
            # Day 5: Belgian VAT (BTW) filing due €4,100
            elif day == 5:
                current_balance -= 4100.0
                event_note = "Belgian VAT / BTW Quarterly Due (-€4,100) - Overdraft!"
            # Day 15: Corporate fixed costs
            elif day == 15:
                current_balance -= 850.0
                event_note = "Telecom & Software Licences (-€850)"
            # Day 30: End of month director pay
            elif day == 30:
                current_balance += 3200.0
                event_note = "Director Basic Salary Draw (+€3,200)"
            # Day 35: Mortgage debit
            elif day == 33:
                current_balance -= 1920.0
                event_note = "Monthly Mortgage Debit (-€1,920)"
            # Day 65: Delayed invoice finally arrives (€14,200)
            elif day == 65:
                current_balance += 14200.0
                event_note = "Delayed Enterprise Invoice Settled (+€14,200)"
            elif day == 63:
                current_balance -= 1920.0
                event_note = "Monthly Mortgage Debit (-€1,920)"

        elif scenario_id == "flemish-epc-lucas-camille":
            # Day 1: Notary duties & architect retainer (-€15,000 cash requirement)
            if day == 1:
                current_balance -= 15000.0
                event_note = "Flemish Cadastral 3% Duty & Notary Retainer (-€15,000)"
            # Day 25: Joint salary deposit (+€4,800)
            elif day in (25, 55, 85):
                current_balance += 4800.0
                event_note = "Monthly Household Joint Salaries (+€4,800)"
            # Day 28: Monthly mortgage repayment (-€1,420)
            elif day in (28, 58, 88):
                current_balance -= 1420.0
                event_note = "Mortgage & Insurance Outflow (-€1,420)"
            # Day 45: Contractor Milestone 1 (-€18,000)
            elif day == 45:
                current_balance -= 18000.0
                event_note = "Contractor Roof & Insulation Tranche 1 (-€18,000)"
            # Day 80: Mijn VerbouwPremie arrives (+€8,400)
            elif day == 80:
                current_balance += 8400.0
                event_note = "Flemish Gov Mijn VerbouwPremie Disbursed (+€8,400)"

        elif scenario_id == "burnout-medical-cliff-vincent":
            # Day 1-30: Regular salary (€4,200 net)
            if day == 1:
                current_balance += 4200.0
                event_note = "Employer Gewaarborgd Loon 100% (+€4,200)"
            # Day 5, 35, 65: Fixed monthly mortgage & living obligations (-€3,200)
            elif day in (5, 35, 65):
                current_balance -= 3200.0
                event_note = f"Mortgage €1,450 + Living Bills (-€3,200) [Day {day}]"
            # Day 31: RIZIV / INAMI Statutory Income Cliff (-49.5% salary)
            elif day == 31:
                current_balance += 2080.0
                event_note = "RIZIV Statutory Disability Cap (+€2,080 vs €4,200 norm)"
            # Day 61: RIZIV Month 2 payment
            elif day == 61:
                current_balance += 2080.0
                event_note = "RIZIV Statutory Disability Cap (+€2,080)"

        # Normal daily living degradation
        current_balance -= 20.0

        points.append(
            DailyCashflowPoint(
                day=day,
                date_offset_str=date_str,
                baseline_balance_eur=round(current_balance, 2),
                hydraulic_balance_eur=round(current_balance, 2),
                event_note=event_note,
            )
        )

    return points


def get_scenario_luc_smet() -> FinancialState:
    """
    Scenario 1: Luc De Smet (Ghent) - SME Tech Founder (Tech BV / SRL).
    Delayed €14.2k invoice, VAT €4.1k due Monday, mortgage €1.92k.
    Corporate IPT reserve €68k under Art. 59 WIB 92.
    """
    profile = CustomerProfile(
        customer_id="sme-invoice-crunch-luc",
        name="Luc De Smet",
        role_type="SME_FREELANCER",
        company_name="De Smet Cloud Consulting BV",
        company_bce_number="BE 0782.912.441",
        joint_committee="PC 200",
        city="Ghent",
        masked_ssn="82.04.18-291.43",
        masked_iban="BE48 7320 9182 4401",
        tenant_id="kbc-corporate-flanders-tenant",
    )

    credits = [
        CreditFacility(
            loan_id="MORT-GHENT-2021-04",
            loan_type="HYPOTHECAIR_KREDIET",
            original_principal_eur=380000.0,
            remaining_principal_eur=312450.0,
            monthly_repayment_eur=1920.0,
            capital_component_eur=1260.0,
            interest_component_eur=660.0,
            interest_rate_pct=2.15,
            term_months_remaining=188,
            moratorium_eligible=True,
            moratorium_months_allowed=6,
        )
    ]

    p1 = Pillar1Banking(
        liquid_current_eur=1450.0,
        savings_buffer_eur=2200.0,
        target_emergency_float_eur=8500.0,
        active_credits=credits,
        monthly_net_income_eur=3200.0,
        monthly_fixed_outflows_eur=3750.0,
        overdraft_limit_eur=1000.0,
    )

    p2 = Pillar2Insurance(
        schuldsaldo=SchuldsaldoPolicy(
            policy_id="ASR-KBC-GHENT-49",
            target_loan_id="MORT-GHENT-2021-04",
            insured_amount_eur=380000.0,
            monthly_premium_eur=82.50,
            synced_with_principal=False,
            coverage_ratio_pct=100.0,
        ),
        fire_home=FireHomePolicy(
            policy_id="FIRE-KBC-9921",
            building_value_eur=450000.0,
            deductible_eur=850.0,
            monthly_premium_eur=48.0,
            eco_rate_discount_pct=0.0,
            under_renovation=False,
        ),
        hospitalization=HospitalizationPolicy(
            policy_id="HOSP-KBC-1120",
            annual_limit_eur=100000.0,
            deductible_eur=250.0,
            monthly_premium_eur=34.0,
        ),
        guaranteed_income=GuaranteedIncomePolicy(
            policy_id="INC-KBC-CORP-01",
            monthly_benefit_eur=2800.0,
            waiting_period_days=30,
            status="ACTIVE",
            employer_provided=True,
        ),
        aggregate_deductibles_eur=1100.0,
    )

    p3 = Pillar3Wealth(
        kbc_investment_funds_eur=12400.0,
        pricos_pension_fund_eur=18500.0,
        corporate_ipt_reserves_eur=68000.0,
        lombard_borrowing_power_eur=54400.0,  # 80% of IPT reserve under Art. 59 WIB 92
        vvpr_bis_liquidity_reserve_eur=35000.0,
        monthly_pension_contribution_eur=250.0,
    )

    daily_cf = _generate_baseline_daily_cashflow(
        initial_liquid=p1.liquid_current_eur + p1.savings_buffer_eur,
        scenario_id="sme-invoice-crunch-luc"
    )

    state = FinancialState(
        profile=profile,
        pillar1_banking=p1,
        pillar2_insurance=p2,
        pillar3_wealth=p3,
        runway_days_pre_intervention=5.0,  # Dips negative on Day 5 when €4.1k VAT hits
        net_burn_rate_eur_per_month=-550.0,
        daily_cashflows=daily_cf,
    )
    state.state_hash = compute_state_hash(state.model_dump())
    return state


def get_scenario_lucas_camille() -> FinancialState:
    """
    Scenario 2: Lucas & Camille (Bertem) - Flemish EPC Homebuyers.
    1974 house, EPC E, €70k renovation facility, €8.4k Mijn VerbouwPremie.
    Bolero/Horizon funds €32k preserved via Lombard pledge (avoiding TOB).
    """
    profile = CustomerProfile(
        customer_id="flemish-epc-lucas-camille",
        name="Lucas & Camille Vandevelde",
        role_type="RETAIL",
        joint_committee="PC 200",
        city="Bertem",
        masked_ssn="95.07.12-301.88",
        masked_iban="BE21 4450 1198 7720",
        tenant_id="kbc-retail-leuven-tenant",
    )

    credits = [
        CreditFacility(
            loan_id="MORT-BERTEM-2026-01",
            loan_type="HYPOTHECAIR_KREDIET",
            original_principal_eur=320000.0,
            remaining_principal_eur=298000.0,
            monthly_repayment_eur=1420.0,
            capital_component_eur=890.0,
            interest_component_eur=530.0,
            interest_rate_pct=3.10,
            term_months_remaining=276,
            moratorium_eligible=True,
            moratorium_months_allowed=6,
        ),
        CreditFacility(
            loan_id="RENOV-BERTEM-2026-02",
            loan_type="RENOVATIELENING",
            original_principal_eur=70000.0,
            remaining_principal_eur=70000.0,
            monthly_repayment_eur=340.0,
            capital_component_eur=210.0,
            interest_component_eur=130.0,
            interest_rate_pct=2.45,
            term_months_remaining=120,
            moratorium_eligible=True,
            moratorium_months_allowed=3,
        ),
    ]

    p1 = Pillar1Banking(
        liquid_current_eur=4200.0,
        savings_buffer_eur=8800.0,
        target_emergency_float_eur=12000.0,
        active_credits=credits,
        monthly_net_income_eur=4800.0,
        monthly_fixed_outflows_eur=3950.0,
        overdraft_limit_eur=0.0,
    )

    p2 = Pillar2Insurance(
        schuldsaldo=SchuldsaldoPolicy(
            policy_id="ASR-KBC-BERTEM-88",
            target_loan_id="MORT-BERTEM-2026-01",
            insured_amount_eur=390000.0,  # Over-insured: includes full untouched €70k reno tranche
            monthly_premium_eur=148.0,
            synced_with_principal=False,
            coverage_ratio_pct=100.0,
        ),
        fire_home=FireHomePolicy(
            policy_id="FIRE-BERTEM-02",
            building_value_eur=420000.0,
            deductible_eur=750.0,
            monthly_premium_eur=58.0,
            eco_rate_discount_pct=0.0,
            under_renovation=True,
        ),
        hospitalization=HospitalizationPolicy(
            policy_id="HOSP-KBC-BERTEM-14",
            annual_limit_eur=100000.0,
            deductible_eur=250.0,
            monthly_premium_eur=42.0,
        ),
        guaranteed_income=None,
        aggregate_deductibles_eur=1000.0,
    )

    p3 = Pillar3Wealth(
        kbc_investment_funds_eur=32000.0,  # KBC Horizon Index Funds in Bolero
        pricos_pension_fund_eur=14200.0,
        corporate_ipt_reserves_eur=0.0,
        lombard_borrowing_power_eur=24000.0,  # 75% LTV on diversified funds
        vvpr_bis_liquidity_reserve_eur=0.0,
        monthly_pension_contribution_eur=300.0,
    )

    daily_cf = _generate_baseline_daily_cashflow(
        initial_liquid=p1.liquid_current_eur + p1.savings_buffer_eur,
        scenario_id="flemish-epc-lucas-camille"
    )

    state = FinancialState(
        profile=profile,
        pillar1_banking=p1,
        pillar2_insurance=p2,
        pillar3_wealth=p3,
        runway_days_pre_intervention=2.0,  # Dips negative on Day 1 when €15k notary duty hits without Lombard bridge
        net_burn_rate_eur_per_month=850.0,
        daily_cashflows=daily_cf,
    )
    state.state_hash = compute_state_hash(state.model_dump())
    return state


def get_scenario_vincent_burnout() -> FinancialState:
    """
    Scenario 3: Vincent (Antwerp) - Acute Burnout & Medical Cliff (PC 226).
    Guaranteed salary ends Day 30, RIZIV cap drops income from €4,200 to €2,080 net.
    Instant mortgage principal moratorium (+€1,200/mo relief) & guaranteed income trigger.
    """
    profile = CustomerProfile(
        customer_id="burnout-medical-cliff-vincent",
        name="Vincent Van Dijck",
        role_type="RETAIL",
        joint_committee="PC 226",  # International Trade & Logistics Joint Committee
        city="Antwerp",
        masked_ssn="80.11.03-145.67",
        masked_iban="BE68 5390 1204 8831",
        tenant_id="kbc-retail-antwerp-tenant",
    )

    credits = [
        CreditFacility(
            loan_id="MORT-ANTWERP-2022-77",
            loan_type="HYPOTHECAIR_KREDIET",
            original_principal_eur=340000.0,
            remaining_principal_eur=288000.0,
            monthly_repayment_eur=1450.0,
            capital_component_eur=1200.0,  # Key: €1,200/mo capital repayment pause available
            interest_component_eur=250.0,
            interest_rate_pct=1.85,
            term_months_remaining=216,
            moratorium_eligible=True,
            moratorium_months_allowed=6,
        )
    ]

    p1 = Pillar1Banking(
        liquid_current_eur=2800.0,
        savings_buffer_eur=3500.0,
        target_emergency_float_eur=9500.0,
        active_credits=credits,
        monthly_net_income_eur=4200.0,  # Pre-cliff: drops to €2,080 on Day 31
        monthly_fixed_outflows_eur=3200.0,
        overdraft_limit_eur=500.0,
    )

    p2 = Pillar2Insurance(
        schuldsaldo=SchuldsaldoPolicy(
            policy_id="ASR-KBC-ANT-90",
            target_loan_id="MORT-ANTWERP-2022-77",
            insured_amount_eur=340000.0,
            monthly_premium_eur=65.0,
            synced_with_principal=False,
            coverage_ratio_pct=100.0,
        ),
        fire_home=FireHomePolicy(
            policy_id="FIRE-ANT-01",
            building_value_eur=390000.0,
            deductible_eur=600.0,
            monthly_premium_eur=44.0,
            eco_rate_discount_pct=0.0,
        ),
        hospitalization=HospitalizationPolicy(
            policy_id="HOSP-KBC-ANT-55",
            annual_limit_eur=100000.0,
            deductible_eur=200.0,
            monthly_premium_eur=36.0,
        ),
        guaranteed_income=GuaranteedIncomePolicy(
            policy_id="GI-KBC-PC226-09",
            monthly_benefit_eur=1600.0,
            waiting_period_days=30,
            status="PRE_APPROVED",
            employer_provided=True,
        ),
        aggregate_deductibles_eur=800.0,
    )

    p3 = Pillar3Wealth(
        kbc_investment_funds_eur=18000.0,
        pricos_pension_fund_eur=22500.0,
        corporate_ipt_reserves_eur=0.0,
        lombard_borrowing_power_eur=13500.0,
        vvpr_bis_liquidity_reserve_eur=0.0,
        monthly_pension_contribution_eur=300.0,
    )

    daily_cf = _generate_baseline_daily_cashflow(
        initial_liquid=p1.liquid_current_eur + p1.savings_buffer_eur,
        scenario_id="burnout-medical-cliff-vincent"
    )

    state = FinancialState(
        profile=profile,
        pillar1_banking=p1,
        pillar2_insurance=p2,
        pillar3_wealth=p3,
        runway_days_pre_intervention=34.0,  # Cash collapses on Day 35 after RIZIV cliff takes effect
        net_burn_rate_eur_per_month=-1120.0,  # Vincent burns €1,120/mo once salary drops to €2,080
        daily_cashflows=daily_cf,
    )
    state.state_hash = compute_state_hash(state.model_dump())
    return state


SCENARIOS_STORE: Dict[str, FinancialState] = {
    "sme-invoice-crunch-luc": get_scenario_luc_smet(),
    "flemish-epc-lucas-camille": get_scenario_lucas_camille(),
    "burnout-medical-cliff-vincent": get_scenario_vincent_burnout(),
}


def get_all_scenarios_metadata() -> List[Dict[str, Any]]:
    """Returns overview metadata for all realistic Belgian scenarios."""
    return [
        {
            "id": "sme-invoice-crunch-luc",
            "title": "SME Invoice Crunch & VAT Due",
            "customer_name": "Luc De Smet",
            "company_name": "De Smet Cloud Consulting BV",
            "archetype": "SME / Tech Founder (Ghent)",
            "risk_level": "CRITICAL",
            "urgency": "Immediate (48 Hours)",
            "summary": "Delayed €14.2k enterprise invoice puts €4.1k quarterly VAT & €1.92k mortgage at imminent risk of default.",
            "statutory_context": "Belgian Art. 59 WIB 92 (80% Rule Corporate IPT Pension Advance), Art. 269 §2 VVPR-bis.",
            "pre_runway_days": 5.0,
            "liquid_current_eur": 1450.0,
            "corporate_ipt_reserves_eur": 68000.0,
            "tags": ["SME", "Peppol Telemetry", "IPT Advance", "VAT Bridge", "Art. 59 WIB 92"],
        },
        {
            "id": "flemish-epc-lucas-camille",
            "title": "Flemish EPC Homebuyer Renovation",
            "customer_name": "Lucas & Camille Vandevelde",
            "company_name": None,
            "archetype": "Young Retail Professionals (Bertem / PC 200)",
            "risk_level": "MODERATE",
            "urgency": "Staged (Renovation Horizon)",
            "summary": "1974 house under Flemish Renovatieplicht (EPC E ➔ A). Need €15k notary duty without liquidating Bolero index funds.",
            "statutory_context": "Vlaams Energie- en Klimaatagentschap (VEKA) EPC Mandate, Mijn VerbouwPremie, Taks op Beursverrichtingen (TOB) Avoidance.",
            "pre_runway_days": 2.0,
            "liquid_current_eur": 4200.0,
            "investment_funds_eur": 32000.0,
            "tags": ["Retail", "Flemish EPC", "Lombard Credit", "Schuldsaldo Sync", "Mijn VerbouwPremie"],
        },
        {
            "id": "burnout-medical-cliff-vincent",
            "title": "Acute Burnout & RIZIV Income Cliff",
            "customer_name": "Vincent Van Dijck",
            "company_name": None,
            "archetype": "Senior Corporate Employee (Antwerp / PC 226)",
            "risk_level": "HIGH",
            "urgency": "Imminent (Day 31 Cliff)",
            "summary": "Gewaarborgd loon expires Day 30; RIZIV disability benefit caps at €2,080, creating a €2,120/mo cash deficit against €1.45k mortgage.",
            "statutory_context": "PC 226 Collective Agreement, RIZIV Statutory Disability Cap, Febelfin Mortgage Moratorium Code.",
            "pre_runway_days": 34.0,
            "liquid_current_eur": 2800.0,
            "mortgage_monthly_eur": 1450.0,
            "tags": ["Health Shock", "RIZIV Cliff", "Mortgage Moratorium (+€1,200/mo)", "Gewaarborgd Inkomen"],
        },
    ]


def get_scenario_by_id(scenario_id: str) -> Optional[FinancialState]:
    """Retrieves fresh copy of the financial state for the given scenario."""
    if scenario_id == "sme-invoice-crunch-luc":
        return get_scenario_luc_smet()
    elif scenario_id == "flemish-epc-lucas-camille":
        return get_scenario_lucas_camille()
    elif scenario_id == "burnout-medical-cliff-vincent":
        return get_scenario_vincent_burnout()
    return None


def get_canvas_ast_for_scenario(scenario_id: str) -> GenUICanvasAST:
    """
    Synthesizes Declarative GenUI Canvas AST for frontend interactive rendering.
    Enforces strict component contracts without sending raw HTML or executable scripts.
    """
    if scenario_id == "sme-invoice-crunch-luc":
        return GenUICanvasAST(
            canvas_id="canvas_sme_luc_ghent_882",
            scenario_id=scenario_id,
            title="KBC Symbiosis SME Dual-Life Bridge",
            subtitle="Autonomous Corporate-to-Household Liquidity Relief for Luc De Smet",
            template="dual_life_bridge_canvas",
            anchors={
                "persistent_nav": True,
                "spatial_compass": "corporate_household_membrane",
                "risk_indicator": "VAT_DEFAULT_RISK",
            },
            widgets=[
                CanvasWidgetNode(
                    component_id="KBC_Hydraulic_Pressure_Gauge",
                    version="2.4.0",
                    slot="primary_stage",
                    props={
                        "title": "Dual-Life Pressure Chamber",
                        "currentPressureBar": 8.7,
                        "nominalPressureBar": 3.2,
                        "shockAbsorptionPct": 100.0,
                        "runwayBeforeDays": 5,
                        "runwayAfterDays": 90,
                        "freedLiquidityEur": 14300.0,
                    },
                    interactions={
                        "onSliderDrag": "RECOMPUTE_HYDRAULIC_SPRINGS",
                        "onCommit": "OPEN_ITSME_DRAWER",
                    },
                ),
                CanvasWidgetNode(
                    component_id="KBC_IPT_Advance_Conduit",
                    version="2.1.0",
                    slot="secondary_stage",
                    props={
                        "companyName": "De Smet Cloud Consulting BV",
                        "iptReserveEur": 68000.0,
                        "statutoryMaxAdvance80Pct": 54400.0,
                        "recommendedAdvanceEur": 12500.0,
                        "legalBasis": "Art. 59 WIB 92 (Pari-Passu Real Estate & Working Capital Advance)",
                        "taxDragPct": 0.0,
                        "interestRatePct": 2.2,
                    },
                    interactions={
                        "onToggleAdvance": "MUTATE_VALVE_3_INTENSITY",
                    },
                ),
                CanvasWidgetNode(
                    component_id="KBC_TimeTravel_Horizon",
                    version="1.9.0",
                    slot="horizon_scrubber",
                    props={
                        "horizonDays": 90,
                        "criticalEvents": [
                            {"day": 3, "label": "Mortgage Debit €1.92k", "resolved": True},
                            {"day": 5, "label": "Belgian VAT €4.1k", "resolved": True},
                            {"day": 65, "label": "Delayed Invoice Settled +€14.2k", "resolved": True},
                        ],
                    },
                ),
            ],
            regulatory_badge={
                "framework": "FSMA & NBB Belgian Corporate Bancassurance",
                "psd2_eidas_ready": True,
                "zero_trust_validated": True,
            },
        )

    elif scenario_id == "flemish-epc-lucas-camille":
        return GenUICanvasAST(
            canvas_id="canvas_epc_bertem_401",
            scenario_id=scenario_id,
            title="KBC Kinetic Canvas: Flemish EPC Transformation",
            subtitle="Continuous Underwriting & Lombard Bridge for Lucas & Camille (Bertem)",
            template="split_simulation_canvas",
            anchors={
                "persistent_nav": True,
                "spatial_compass": "epc_renovation_horizon",
                "risk_indicator": "DUTY_TAX_OVERRUN",
            },
            widgets=[
                CanvasWidgetNode(
                    component_id="KBC_Mortgage_Bender",
                    version="2.4.0",
                    slot="primary_stage",
                    props={
                        "propertyPrice": 360000.0,
                        "currentEpc": "E",
                        "targetEpc": "A",
                        "baseRatePct": 3.10,
                        "ecoRateDiscountPct": 0.20,
                        "renovationTrancheEur": 70000.0,
                        "mijnVerbouwPremieEstimateEur": 8400.0,
                    },
                    interactions={
                        "onSliderDrag": "RECALCULATE_LOCAL_SPRING",
                        "onCommit": "INITIATE_ITSME_PREAPPROVAL",
                    },
                ),
                CanvasWidgetNode(
                    component_id="KBC_Lombard_Bridge_Dock",
                    version="2.0.0",
                    slot="secondary_stage",
                    props={
                        "collateralAsset": "Bolero / KBC Horizon Fund (€32,000)",
                        "notaryCreditLineEur": 15000.0,
                        "tobTaxAvoidanceEur": 450.0,
                        "compoundingPreserved": True,
                        "lombardRatePct": 2.4,
                    },
                ),
            ],
            regulatory_badge={
                "framework": "Vlaams Energieagentschap (VEKA) & Solvency II",
                "psd2_eidas_ready": True,
                "zero_trust_validated": True,
            },
        )

    else:  # Vincent burnout
        return GenUICanvasAST(
            canvas_id="canvas_burnout_vincent_991",
            scenario_id=scenario_id,
            title="KBC Haven: Income Shield & Mortgage Moratorium",
            subtitle="Automated Statutory Relief & Solvency Protection for Vincent (PC 226)",
            template="crisis_relief_hud",
            anchors={
                "persistent_nav": True,
                "spatial_compass": "medical_cliff_shield",
                "risk_indicator": "DEFAULT_CLIFF_DAY_31",
            },
            widgets=[
                CanvasWidgetNode(
                    component_id="KBC_Mortgage_Moratorium_Card",
                    version="2.2.0",
                    slot="primary_stage",
                    props={
                        "activeMortgagePaymentEur": 1450.0,
                        "capitalPausedEurPerMonth": 1200.0,
                        "interestOnlyPaymentEur": 250.0,
                        "durationMonths": 6,
                        "immediateReliefEur": 7200.0,
                        "legalBasis": "Febelfin Belgian Mortgage Moratorium Charter",
                    },
                    interactions={
                        "onActivate": "TOGGLE_VALVE_4_MORATORIUM",
                    },
                ),
                CanvasWidgetNode(
                    component_id="KBC_Income_Bridge_Monitor",
                    version="1.7.0",
                    slot="secondary_stage",
                    props={
                        "baselineSalaryNetEur": 4200.0,
                        "rizivStatutoryCapEur": 2080.0,
                        "kbcDisabilityPayoutEur": 1600.0,
                        "netHouseholdIncomeProtectedEur": 3680.0,
                        "netDeficitNeutralized": True,
                    },
                ),
            ],
            regulatory_badge={
                "framework": "Febelfin Code of Conduct & RIZIV Social Code",
                "psd2_eidas_ready": True,
                "zero_trust_validated": True,
            },
        )
