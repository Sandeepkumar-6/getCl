import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateSettlement } from "../src/services/settlement.js";

const policy = { insuredDeclaredValue: 10_000_000, deductible: 100_000, voluntaryDeductible: 0 };
const line = { part: "Bumper", category: "PLASTIC", cost: 400_000, labour: 50_000 };

test("parts depreciation excludes labour; NCB affects renewal, not payout", () => {
  const result = calculateSettlement({ lineItems: [line], policy: { ...policy, ncbPercent: 20, ownDamagePremium: 100_000 } });
  assert.equal(result.gross, 450_000);
  assert.equal(result.depreciation, 200_000);
  assert.equal(result.netPayable, 150_000);
  assert.equal(result.ncbImpact, 20_000);
  assert.equal(result.customerShare, 300_000);
});

test("zero-depreciation add-on waives parts depreciation", () => {
  const result = calculateSettlement({ lineItems: [line], policy: { ...policy, zeroDepreciation: true } });
  assert.equal(result.depreciation, 0);
  assert.equal(result.netPayable, 350_000);
});

test("deductibles larger than loss never create negative payout", () => {
  const result = calculateSettlement({ lineItems: [{ ...line, cost: 100, labour: 0 }], policy });
  assert.equal(result.netPayable, 0);
  assert.equal(result.customerShare, 100);
});

test("CTL is strictly above 75 percent and caps payout at IDV", () => {
  const assess = (cost) => calculateSettlement({ lineItems: [{ category: "GLASS", cost }], policy });
  assert.equal(assess(7_500_000).totalLoss, false);
  assert.equal(assess(7_500_001).totalLoss, true);
  const result = assess(15_000_000);
  assert.equal(result.gross, policy.insuredDeclaredValue);
  assert.equal(result.netPayable, 9_900_000);
  assert.equal(result.idvCap, policy.insuredDeclaredValue);
  assert.equal(result.depreciation, 0);
});

test("theft and total loss use IDV less deductibles and explicitly assessed salvage", () => {
  for (const claimType of ["THEFT", "TOTAL_LOSS"]) {
    const result = calculateSettlement({ claimType, policy: { ...policy, voluntaryDeductible: 50_000 }, salvage: 1_000_000 });
    assert.equal(result.gross, 10_000_000);
    assert.equal(result.netPayable, 8_850_000);
  }
});

test("category, age bands, explicit rates and rounding are deterministic", () => {
  const assess = (category, vehicleAgeMonths, extra = {}) => calculateSettlement({
    policy, vehicleAgeMonths, lineItems: [{ category, cost: 101, ...extra }],
  }).depreciation;
  assert.equal(assess("GLASS", 150), 0);
  assert.equal(assess("FIBRE_GLASS", 1), 30);
  assert.equal(assess("OTHER", 6), 0);
  assert.equal(assess("OTHER", 7), 5);
  assert.equal(assess("OTHER", 121), 51);
  assert.equal(assess("PAINTING", 1), 13);
  assert.equal(assess("OTHER", 1, { depreciationPercent: 25 }), 25);
});

test("reject fractional, negative, non-finite and unsafe amounts and invalid rates", () => {
  for (const cost of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "100"]) {
    assert.throws(() => calculateSettlement({ policy, lineItems: [{ ...line, cost }] }), /safe integer/);
  }
  for (const depreciationPercent of [-1, 101, NaN, "50", 0.001]) {
    assert.throws(() => calculateSettlement({ policy, lineItems: [{ ...line, depreciationPercent }] }), /depreciationPercent/);
  }
  assert.throws(() => calculateSettlement({ policy, lineItems: [{ ...line, cost: Number.MAX_SAFE_INTEGER }] }), /safe integer/);
  assert.throws(() => calculateSettlement({ policy, salvage: policy.insuredDeclaredValue + 1 }), /salvage/);
  assert.throws(() => calculateSettlement({ policy, claimType: "THIRD_PARTY" }), /liability award/);
});

test("does not mutate inputs and handles maximum safe monetary values precisely", () => {
  const input = { policy: { ...policy, insuredDeclaredValue: Number.MAX_SAFE_INTEGER, deductible: 0 }, claimType: "THEFT" };
  const before = structuredClone(input);
  assert.equal(calculateSettlement(input).netPayable, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(input, before);
});
