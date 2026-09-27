import { rules } from "../config/rules.js";

const money = (value, field) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer in paise`);
  }
  return value;
};

const safeNumber = (value, field) => money(Number(value), field);

const percentage = (value, field) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${field} must be between 0 and 100`);
  }
  const basisPoints = Math.round(value * 100);
  if (Math.abs(value * 100 - basisPoints) > 0.000001) {
    throw new RangeError(`${field} supports at most two decimal places`);
  }
  return basisPoints;
};

// Round once to the nearest paise; BigInt avoids intermediate floating-point overflow.
const percentageOf = (amount, basisPoints) =>
  safeNumber((BigInt(amount) * BigInt(basisPoints) + 5_000n) / 10_000n, "Percentage amount");

const categoryRate = (category, ageMonths) => {
  const normalized = String(category || "OTHER").replace(/[^a-z]/gi, "").toUpperCase();
  const rates = rules.settlement.partsDepreciationPercent;
  if (["GLASS"].includes(normalized)) return rates.glass;
  if (["FIBREGLASS", "FIBERGLASS"].includes(normalized)) return rates.fibreGlass;
  if (["RUBBER", "NYLON", "PLASTIC", "TYRE", "TYRES", "TIRE", "TIRES", "TUBE", "TUBES", "BATTERY", "BATTERIES", "RUBBERNYLONPLASTICTYRESTUBESBATTERIES"].includes(normalized)) {
    return rates.rubberNylonPlasticTyresTubesBatteries;
  }
  if (normalized === "PAINTINGMATERIAL") return rates.paintingMaterial;
  if (["PAINTING", "CONSOLIDATEDPAINTING"].includes(normalized)) {
    return rates.paintingMaterial * rates.consolidatedPaintingMaterialComponent / 100;
  }
  if (!["OTHER", "METAL", "OTHERPARTS"].includes(normalized)) {
    throw new RangeError(`Unknown part category: ${category}`);
  }
  return rules.settlement.otherPartsDepreciationPercentByVehicleAge.find(
    (band) => band.upToMonths === null || ageMonths <= band.upToMonths,
  ).percent;
};

/** Pure assessment helper. All monetary inputs and outputs are integer paise. */
export function calculateSettlement({
  lineItems = [],
  policy,
  claimType = "OWN_DAMAGE",
  salvage = 0,
  vehicleAgeMonths = 0,
} = {}) {
  if (claimType === "THIRD_PARTY") {
    throw new RangeError("Third-party liability requires a separately reviewed liability award; own-damage settlement rules do not apply");
  }
  if (!["OWN_DAMAGE", "THEFT", "TOTAL_LOSS"].includes(claimType)) {
    throw new RangeError("Unsupported claim type");
  }
  if (!policy || typeof policy !== "object") throw new TypeError("Policy is required");
  if (!Array.isArray(lineItems)) throw new TypeError("lineItems must be an array");
  money(vehicleAgeMonths, "vehicleAgeMonths");
  const idv = money(policy.insuredDeclaredValue, "insuredDeclaredValue");
  if (idv === 0) throw new RangeError("insuredDeclaredValue must be greater than zero");
  const policyDeductible = money(policy.deductible ?? 0, "deductible");
  const voluntaryDeductible = money(policy.voluntaryDeductible ?? 0, "voluntaryDeductible");
  const ownDamagePremium = money(policy.ownDamagePremium ?? 0, "ownDamagePremium");
  const ncbRate = percentage(policy.ncbPercent ?? 0, "ncbPercent");
  money(salvage, "salvage");
  if (salvage > idv) throw new RangeError("salvage cannot exceed insured declared value");
  if (policy.zeroDepreciation !== undefined && typeof policy.zeroDepreciation !== "boolean") {
    throw new TypeError("zeroDepreciation must be a boolean");
  }

  const assessedLines = lineItems.map((line, index) => {
    if (!line || typeof line !== "object") throw new TypeError(`lineItems[${index}] must be an object`);
    const cost = money(line.cost, `lineItems[${index}].cost`);
    const labour = money(line.labour ?? 0, `lineItems[${index}].labour`);
    const defaultRate = categoryRate(line.category, vehicleAgeMonths);
    const requestedRate = percentage(line.depreciationPercent ?? defaultRate, `lineItems[${index}].depreciationPercent`);
    const appliedRate = policy.zeroDepreciation ? 0 : requestedRate;
    const gross = safeNumber(BigInt(cost) + BigInt(labour), "Line gross");
    const depreciation = percentageOf(cost, appliedRate);
    return {
      part: String(line.part ?? ""), category: line.category || "OTHER", cost, labour,
      depreciationPercent: appliedRate / 100, depreciation, gross,
      netPayable: gross - depreciation,
    };
  });
  const repairGross = safeNumber(assessedLines.reduce((sum, line) => sum + BigInt(line.gross), 0n), "Repair gross");
  const totalLoss = claimType === "TOTAL_LOSS" || (claimType === "OWN_DAMAGE" &&
    BigInt(repairGross) * 100n > BigInt(idv) * BigInt(rules.settlement.constructiveTotalLossRepairToIdvPercent));
  const idvSettlement = totalLoss || claimType === "THEFT";
  const gross = idvSettlement ? idv : repairGross;
  const lines = assessedLines.map((line) => idvSettlement
    ? { ...line, depreciation: 0, depreciationPercent: 0, netPayable: line.gross }
    : line);
  const depreciation = safeNumber(lines.reduce((sum, line) => sum + BigInt(line.depreciation), 0n), "Depreciation");
  const afterDepreciation = gross - depreciation;
  const idvCapReduction = Math.max(0, afterDepreciation - idv);
  const beforeDeductions = Math.min(idv, afterDepreciation);
  const remainder = BigInt(beforeDeductions) - BigInt(policyDeductible) - BigInt(voluntaryDeductible) - BigInt(salvage);
  const netPayable = remainder > 0n ? safeNumber(remainder, "netPayable") : 0;

  return {
    gross, depreciation, policyDeductible, voluntaryDeductible,
    ncbImpact: percentageOf(ownDamagePremium, ncbRate),
    salvage, idvCap: idv, idvCapReduction, netPayable,
    customerShare: gross - netPayable, totalLoss, lines,
    notice: `${rules.settlement.uiNotice} NCB impact estimates a renewal discount loss and is not deducted from this payout. Salvage applies only where explicitly assessed and retained by the policyholder.`,
  };
}

export default calculateSettlement;
