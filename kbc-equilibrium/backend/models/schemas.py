"""
KBC Equilibrium - Pydantic v2 Schemas & Data Contracts
======================================================
Strict, production-grade schemas for Belgian Bancassurance:
- Tri-Pillar Unified Data Architecture (Banking, Insurance, Wealth)
- SME / Freelancer Dual-Life Telemetry (Art. 59 WIB 92, VVPR-bis)
- Hydraulic Rebalancing Solvers & 90-Day Runway Projections
- Itsme® Strong Customer Authentication (SCA) & Aikido Audit Trail
- Declarative GenUI Canvas AST (Gemini 1.5 Flash structured output contract)
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
import uuid
from datetime import datetime


# ============================================================================
# 1. CUSTOMER PROFILE & SECURITY CONTEXT
# ============================================================================

class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    customer_id: str = Field(..., description="Unique customer ID (e.g. kbc-be-luc-smet)")
    name: str = Field(..., description="Full legal name")
    role_type: Literal["RETAIL", "SME_FREELANCER"] = Field(..., description="Retail individual vs SME/Self-employed")
    company_name: Optional[str] = Field(None, description="Belgian BV / SRL / CommV company name if applicable")
    company_bce_number: Optional[str] = Field(None, description="Belgian Enterprise CBE/KBO number (BE 0xxx.xxx.xxx)")
    joint_committee: Optional[str] = Field(None, description="Paritair Comité (e.g. PC 200, PC 226)")
    city: str = Field(..., description="Belgian municipality (e.g. Ghent, Bertem, Antwerp)")
    masked_ssn: str = Field(..., description="Masked Belgian National Register Number")
    masked_iban: str = Field(..., description="Masked primary checking account IBAN")
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str = Field(default="kbc-belgium-retail-tenant")


# ============================================================================
# 2. TRI-PILLAR FINANCIAL STATE
# ============================================================================

class CreditFacility(BaseModel):
    """Pillar 1 Credit Contract (Mortgage, Renovation facility, Lombard line)."""
    loan_id: str
    loan_type: Literal["HYPOTHECAIR_KREDIET", "RENOVATIELENING", "LOMBARD_KREDIET", "BEDRIJFSKREDIET"]
    original_principal_eur: float
    remaining_principal_eur: float
    monthly_repayment_eur: float
    capital_component_eur: float
    interest_component_eur: float
    interest_rate_pct: float
    term_months_remaining: int
    moratorium_eligible: bool = True
    moratorium_months_allowed: int = 6


class Pillar1Banking(BaseModel):
    """Pillar 1: Cash, Liquidity Buffer & Active Debt."""
    liquid_current_eur: float = Field(..., description="Checking account balance (Zichtrekening)")
    savings_buffer_eur: float = Field(..., description="Regulated savings account balance (Spaarrekening)")
    target_emergency_float_eur: float = Field(..., description="Calculated statutory emergency float")
    active_credits: List[CreditFacility] = Field(default_factory=list)
    monthly_net_income_eur: float = Field(..., description="Regular monthly net salary or dividend draw")
    monthly_fixed_outflows_eur: float = Field(..., description="Total monthly obligations (debt + utilities + basics)")
    overdraft_limit_eur: float = 0.0


class SchuldsaldoPolicy(BaseModel):
    """Outstanding Balance Life Insurance (Schuldsaldoverzekering / ASR)."""
    policy_id: str
    target_loan_id: str
    insured_amount_eur: float
    monthly_premium_eur: float
    synced_with_principal: bool = True
    coverage_ratio_pct: float = 100.0


class FireHomePolicy(BaseModel):
    """Property & Building Insurance (Brandverzekering / Woningverzekering)."""
    policy_id: str
    building_value_eur: float
    deductible_eur: float = Field(..., description="Franchise / deductible per claim")
    monthly_premium_eur: float
    eco_rate_discount_pct: float = 0.0
    under_renovation: bool = False


class HospitalizationPolicy(BaseModel):
    """Health & Hospitalization Insurance (Hospitalisatieverzekering)."""
    policy_id: str
    annual_limit_eur: float
    deductible_eur: float = Field(..., description="Franchise / deductible per admission")
    monthly_premium_eur: float


class GuaranteedIncomePolicy(BaseModel):
    """Income Protection Insurance (Gewaarborgd Inkomen / Omzetverzekering)."""
    policy_id: str
    monthly_benefit_eur: float = Field(..., description="Monthly payout during incapacity")
    waiting_period_days: int = Field(30, description="Carentietijd (e.g. 30 days aligned with Gewaarborgd Loon)")
    status: Literal["INACTIVE", "ACTIVE", "PRE_APPROVED", "CLAIM_TRIGGERED"] = "ACTIVE"
    employer_provided: bool = False


class Pillar2Insurance(BaseModel):
    """Pillar 2: Bancassurance Policies & Deductible Architecture."""
    schuldsaldo: Optional[SchuldsaldoPolicy] = None
    fire_home: Optional[FireHomePolicy] = None
    hospitalization: Optional[HospitalizationPolicy] = None
    guaranteed_income: Optional[GuaranteedIncomePolicy] = None
    aggregate_deductibles_eur: float = Field(..., description="Sum of all active insurance deductibles")


class Pillar3Wealth(BaseModel):
    """Pillar 3: Investments, Pension Assets & Corporate Reserves."""
    kbc_investment_funds_eur: float = Field(0.0, description="KBC Horizon / Bolero investment portfolio")
    pricos_pension_fund_eur: float = Field(0.0, description="Pillar 3 tax-deductible pension fund (Pricos)")
    corporate_ipt_reserves_eur: float = Field(0.0, description="IPT / EIP corporate pension reserve under Art. 59 WIB 92")
    lombard_borrowing_power_eur: float = Field(0.0, description="Available asset-pledged credit line without selling")
    vvpr_bis_liquidity_reserve_eur: float = Field(0.0, description="Locked corporate reserve awaiting 15% VVPR-bis window")
    monthly_pension_contribution_eur: float = Field(0.0, description="Discretionary monthly auto-invest flow")


class DailyCashflowPoint(BaseModel):
    """Single point in the 90-day cashflow runway."""
    day: int
    date_offset_str: str
    baseline_balance_eur: float
    hydraulic_balance_eur: float
    event_note: Optional[str] = None


class FinancialState(BaseModel):
    """Unified Tri-Pillar Balance Sheet & Cashflow Runway."""
    profile: CustomerProfile
    pillar1_banking: Pillar1Banking
    pillar2_insurance: Pillar2Insurance
    pillar3_wealth: Pillar3Wealth
    runway_days_pre_intervention: float = Field(..., description="Days until zero cash without hydraulic intervention")
    net_burn_rate_eur_per_month: float = Field(..., description="Monthly net deficit or surplus")
    daily_cashflows: List[DailyCashflowPoint] = Field(default_factory=list)
    state_hash: Optional[str] = None


# ============================================================================
# 3. HYDRAULIC REBALANCING SOLVER MODELS
# ============================================================================

class HydraulicRebalanceRequest(BaseModel):
    """Inputs to the hydraulic rebalancing engine."""
    scenario_id: str
    shock_absorption_pct: float = Field(
        100.0,
        ge=0.0,
        le=100.0,
        description="Intensity slider (0% = baseline static, 100% = full hydraulic relief)"
    )
    activate_valve_1_buffer_float: bool = True
    activate_valve_2_amortization_sync: bool = True
    activate_valve_3_lombard_ipt_advance: bool = True
    activate_valve_4_mortgage_moratorium: bool = False
    custom_overrides: Optional[Dict[str, Any]] = None


class Valve1Result(BaseModel):
    """Valve 1: Dynamic Liquidity Buffer vs Insurance Deductibles."""
    name: str = "Valve 1: Dynamic Liquidity Buffer vs Insurance Deductibles"
    adjusted_target_buffer_eur: float
    freed_liquidity_eur: float
    deductible_delta_eur: float
    monthly_premium_delta_eur: float
    explanation: str


class Valve2Result(BaseModel):
    """Valve 2: Amortization-Coupled Insurance Discount (Schuldsaldoverzekering)."""
    name: str = "Valve 2: Amortization-Coupled Insurance Continuous Underwriting"
    current_mortgage_principal_eur: float
    original_insured_amount_eur: float
    recalibrated_insured_amount_eur: float
    monthly_premium_savings_eur: float
    annual_savings_eur: float
    explanation: str


class Valve3Result(BaseModel):
    """Valve 3: Asset-Backed Lombard / IPT Pension Advance (Art. 59 WIB 92 80% Rule)."""
    name: str = "Valve 3: Asset-Backed Lombard & IPT Pension Advance (Art. 59 WIB 92)"
    pledged_asset_type: Literal["IPT_PENSION_ART_59", "BOLERO_INVESTMENT_FUNDS", "NONE"]
    asset_valuation_eur: float
    max_statutory_advance_eur: float
    advance_drawn_eur: float
    interest_rate_pct: float
    tax_drag_saved_eur: float
    explanation: str


class Valve4Result(BaseModel):
    """Valve 4: Mortgage Principal Moratorium (+€1,200/mo Liquidity Injection)."""
    name: str = "Valve 4: Mortgage Principal Moratorium (Kapitaaluitstel)"
    moratorium_activated: bool
    capital_repayment_paused_eur_per_month: float
    interest_only_monthly_payment_eur: float
    moratorium_duration_months: int
    total_liquidity_injected_eur: float
    explanation: str


class HydraulicSummary(BaseModel):
    """Aggregated financial outcome of the hydraulic solver."""
    total_immediate_liquidity_freed_eur: float
    monthly_cashflow_improvement_eur: float
    runway_extension_days: int
    pre_runway_days: float
    post_runway_days: float
    equilibrium_health_score: float = Field(..., ge=0.0, le=100.0)
    fiscal_drag_prevented_eur: float


class HydraulicRebalanceResponse(BaseModel):
    """Full deterministic output of the hydraulic solver."""
    scenario_id: str
    shock_absorption_pct: float
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    valve_1_result: Valve1Result
    valve_2_result: Valve2Result
    valve_3_result: Valve3Result
    valve_4_result: Valve4Result
    summary: HydraulicSummary
    cashflow_projection_90d: List[DailyCashflowPoint]
    updated_financial_state: FinancialState
    audit_hash: str


# ============================================================================
# 4. ITSME® STRONG CUSTOMER AUTHENTICATION (SCA) & AUDIT
# ============================================================================

class ItsmeSCARequest(BaseModel):
    """Customer-initiated Itsme® biometric validation request."""
    scenario_id: str
    rebalance_payload: HydraulicRebalanceRequest
    customer_action: str = "AUTHORIZE_TRI_PILLAR_HYDRAULIC_REBALANCE"
    phone_or_identity_token: str = "+32470123456"
    customer_token: Optional[str] = None
    totp_or_biometric_assertion: str = "ITSME_BIOMETRIC_ASSERTION_OK"
    device_fingerprint: Optional[str] = "iPhone15Pro_iOS18_KBC_Mobile_v5.4"


class ItsmeSCAResponse(BaseModel):
    """Cryptographically stamped Itsme® callback response."""
    transaction_id: str
    itsme_status: Literal["SUCCESS", "REJECTED", "EXPIRED"]
    itsme_assurance_level: Literal["HIGH_EIDAS", "SUBSTANTIAL"]
    timestamp: str
    atomic_commit_executed: bool
    masked_identity: str
    signed_hash: str
    audit_record_id: str
    rebalance_summary: HydraulicSummary


class SecurityAuditRecord(BaseModel):
    """Aikido & FSMA/NBB Compliant Audit Record."""
    audit_id: str
    timestamp: str
    user_pseudonym: str
    tenant_id: str
    action_type: str
    sanitized_payload: Dict[str, Any]
    regulatory_frameworks: List[str]
    state_hash: str


# ============================================================================
# 5. DECLARATIVE GENUI CANVAS AST
# ============================================================================

class CanvasWidgetNode(BaseModel):
    """Atomic Declarative UI component node."""
    component_id: str = Field(..., description="e.g. KBC_Mortgage_Bender, KBC_Hydraulic_Pressure_Gauge")
    version: str = "2.4.0"
    slot: Literal["primary_stage", "secondary_stage", "telemetry_sidebar", "footer_action", "horizon_scrubber"]
    props: Dict[str, Any]
    interactions: Dict[str, str] = Field(default_factory=dict)


class GenUICanvasAST(BaseModel):
    """Declarative Canvas AST synthesized for KBC Mobile frontend."""
    schema_version: str = "https://kbc.com/schemas/genui/canvas-v2.json"
    canvas_id: str
    scenario_id: str
    title: str
    subtitle: str
    template: Literal["split_simulation_canvas", "dual_life_bridge_canvas", "crisis_relief_hud"]
    anchors: Dict[str, Any]
    widgets: List[CanvasWidgetNode]
    regulatory_badge: Dict[str, Any]
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
