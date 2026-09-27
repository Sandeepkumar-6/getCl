import { test } from "node:test";
import assert from "node:assert/strict";
import { getConfiguredRules, rules } from "../src/config/rules.js";

test("regulatory rules use paise and the current IRDAI claim clocks", () => {
  assert.equal(rules.meta.moneyUnit, "paise");
  assert.equal(rules.survey.mandatoryMotorLossThresholdPaise, 5_000_000);
  assert.equal(rules.claimSla.surveyorAllocationHours, 24);
  assert.equal(rules.claimSla.surveyReportDays, 15);
  assert.equal(rules.claimSla.insurerDecisionDays, 7);
  assert.equal(rules.claimSla.surveyorDelayCompensationPaisePerDay, 50_000);
  assert.equal(rules.claimSla.delayedClaimInterestAboveBankRatePercentagePoints, 2);
});

test("UNVERIFIED monetary defaults are labelled and configurable", () => {
  const configured = getConfiguredRules({
    ON_ACCOUNT_PAYMENT_PERCENT: "35",
    VOLUNTARY_DEDUCTIBLE_OPTIONS_PAISE: "100000,300000",
  });

  assert.equal(configured.workflowDefaults.onAccountPaymentPercent, 35);
  assert.equal(configured.workflowDefaults.confidence, "UNVERIFIED");
  assert.match(configured.workflowDefaults.uiNotice, /Sample value, not legal advice/);
  assert.deepEqual(configured.settlement.voluntaryDeductibleOptionsPaise, [100_000, 300_000]);
  assert.ok(Object.isFrozen(configured));
  assert.ok(Object.isFrozen(configured.settlement));
});

test("invalid configuration falls back to documented sample values", () => {
  const configured = getConfiguredRules({
    ON_ACCOUNT_PAYMENT_PERCENT: "not-a-number",
    VOLUNTARY_DEDUCTIBLE_OPTIONS_PAISE: "invalid,-1",
  });

  assert.equal(configured.workflowDefaults.onAccountPaymentPercent, 50);
  assert.deepEqual(configured.settlement.voluntaryDeductibleOptionsPaise, [
    250_000,
    500_000,
    750_000,
    1_500_000,
  ]);
});
