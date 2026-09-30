/**
 * Every number the engine does not read from the customer's own transactions.
 *
 * Indicative Flemish values for 2026, deliberately round. They are shown to the
 * customer next to each estimate ("How we calculated this"), so nothing is a
 * black box. In production these would come from a maintained reference table
 * (VREG, Energiesparen, CREG), not from code.
 */
export const ASSUMPTIONS = {
  electricity: {
    /** All-in variable price per kWh for a household, incl. network costs and VAT. */
    pricePerKwh: 0.3,
    /** Fixed yearly part of an electricity bill (subscription, capacity tariff, levies). */
    fixedPerYear: 240,
    /** What a supplier pays for injected solar power. */
    injectionPerKwh: 0.04,
    /** Grid CO2 intensity, kg per kWh. */
    co2PerKwh: 0.15,
  },
  gas: {
    pricePerKwh: 0.1,
    fixedPerYear: 180,
    co2PerKwh: 0.2,
  },
  solar: {
    /** Yearly yield per installed kWp in Belgium. */
    yieldPerKwp: 900,
    /** Turnkey price per kWp, incl. 6% VAT for homes older than 10 years. */
    costPerKwp: 1400,
    /** Share of the production used directly, without a battery. */
    selfConsumption: 0.35,
    /** Same, when a heat pump runs on the same meter. */
    selfConsumptionWithHeatPump: 0.45,
    /** With a home battery. */
    selfConsumptionWithBattery: 0.65,
    batteryCost: 4_000,
    minKwp: 3,
    maxKwp: 8,
  },
  heatingOil: {
    /** Fallback when the delivery note does not mention litres. */
    pricePerLitre: 1.05,
    kwhPerLitre: 10,
    boilerEfficiency: 0.85,
    co2PerLitre: 2.68,
    /** Yearly boiler maintenance and tank inspection. */
    maintenancePerYear: 220,
  },
  heatPump: {
    /** Seasonal coefficient of performance, air-to-water. */
    scop: 3.5,
    /** Installed, before premiums. */
    cost: 14_000,
    maintenancePerYear: 100,
    /** Share of heat pump power that solar panels can cover. */
    solarCoverage: 0.2,
  },
  mobility: {
    petrolPerLitre: 1.75,
    co2PerLitrePetrol: 2.31,
    litresPer100km: 6.5,
    evKwhPer100km: 18,
    /** Blended price when you cannot charge at home. */
    publicChargingPerKwh: 0.45,
    /** Typical price at a public fast/AC charger. */
    publicChargingObserved: 0.59,
    /** Lower servicing, no oil changes. */
    evMaintenanceSaving: 300,
    homeChargerCost: 1_300,
  },
  energyContract: {
    /** What switching to the cheapest comparable contract typically saves. */
    switchSaving: 0.12,
  },
  pension: {
    /** Maximum yearly deposit for the 30% tax reduction. */
    maxDeposit: 1_050,
    taxRate: 0.3,
  },
  streaming: {
    /** Services you can pause without losing anything, only the running month. */
    rotatable: ['netflix', 'disney', 'streamz', 'hbo', 'prime', 'youtube', 'vtmgo'],
  },
  savings: {
    /** Months of expenses to keep on the current account as a buffer. */
    bufferMonths: 3,
    savingsRate: 0.0125,
  },
} as const;

/** Round to a number that does not pretend to be more precise than it is. */
export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
