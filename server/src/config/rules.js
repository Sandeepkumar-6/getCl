const CHECKED_ON = "2026-09-21";
const SAMPLE_VALUE_NOTICE = "Sample value, not legal advice. Confirm against the issued policy.";

const numberFromEnv = (env, key, fallback) => {
  const value = env[key];
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const listFromEnv = (env, key, fallback) => {
  const value = env[key];
  if (!value) return fallback;

  const parsed = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isSafeInteger(item) && item >= 0);

  return parsed.length ? parsed : fallback;
};

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const getConfiguredRules = (env = process.env) =>
  deepFreeze({
    meta: {
      jurisdiction: "India",
      checkedOn: CHECKED_ON,
      moneyUnit: "paise",
      disclaimer: "Policy wording, current regulation, and qualified legal review control each claim.",
      sampleValueNotice: SAMPLE_VALUE_NOTICE,
    },

    // IRDAI/PP&GR/CIR/MISC/117/9/2024, Part V.4, effective 2024-09-05.
    // https://irdai.gov.in/document-detail?documentId=5625747 — checked 2026-09-21.
    claimSla: {
      surveyorAllocationHours: 24,
      surveyReportDays: 15,
      insurerDecisionDays: 7,
      insurerDecisionClock: "EARLIER_OF_SURVEY_REPORT_OR_15_DAYS_FROM_ALLOCATION",
      surveyorDelayCompensationPaisePerDay: 50_000,
      delayedClaimInterestAboveBankRatePercentagePoints: 2,
      confidence: "confirmed by primary source",
    },

    // Same circular, Part V.4.1. The drafting says “exceeds Rs 50,000/- or more”; the
    // Government's 2025 implementation summary confirms claims below Rs 50,000 need
    // not be mandatorily surveyed. https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2204758
    // checked 2026-09-21.
    survey: {
      mandatoryMotorLossThresholdPaise: 5_000_000,
      comparison: "GREATER_THAN_OR_EQUAL",
      belowThresholdMayUseDeskAssessment: true,
      statutoryClassExemptions: [],
      statutoryClassExemptionsConfidence: "UNVERIFIED",
      exemptionsNote:
        "No current published class-exemption order was located. Do not infer that third-party, theft, or fixed-benefit claims are exempt; decide from the claim and policy.",
      confidence: "confirmed by primary source",
    },

    // Current insurer product wording, not a universal statutory tariff.
    // https://www.icicilombard.com/docs/default-source/default-document-library/private-car-package-policy-wording.pdf
    // https://www.tataaig.com/s3/Auto_Secure_Private_Car_Package_Base_Policy_Wording_31ed1ddc55.pdf
    // checked 2026-09-21.
    settlement: {
      constructiveTotalLossRepairToIdvPercent: 75,
      compulsoryDeductiblePaise: {
        privateCarUpTo1500cc: 100_000,
        privateCarAbove1500cc: 200_000,
        twoWheeler: 10_000,
      },
      voluntaryDeductibleOptionsPaise: listFromEnv(env, "VOLUNTARY_DEDUCTIBLE_OPTIONS_PAISE", [
        250_000, 500_000, 750_000, 1_500_000,
      ]),
      noClaimBonusPercentByCompletedClaimFreeYears: {
        1: 20,
        2: 25,
        3: 35,
        4: 45,
        5: 50,
      },
      partsDepreciationPercent: {
        rubberNylonPlasticTyresTubesBatteries: 50,
        fibreGlass: 30,
        glass: 0,
        paintingMaterial: 50,
        consolidatedPaintingMaterialComponent: 25,
      },
      otherPartsDepreciationPercentByVehicleAge: [
        { overMonths: 0, upToMonths: 6, percent: 0 },
        { overMonths: 6, upToMonths: 12, percent: 5 },
        { overMonths: 12, upToMonths: 24, percent: 10 },
        { overMonths: 24, upToMonths: 36, percent: 15 },
        { overMonths: 36, upToMonths: 48, percent: 25 },
        { overMonths: 48, upToMonths: 60, percent: 35 },
        { overMonths: 60, upToMonths: 120, percent: 40 },
        { overMonths: 120, upToMonths: null, percent: 50 },
      ],
      idvDepreciationPercentByVehicleAge: [
        { overMonths: 0, upToMonths: 6, percent: 5 },
        { overMonths: 6, upToMonths: 12, percent: 15 },
        { overMonths: 12, upToMonths: 24, percent: 20 },
        { overMonths: 24, upToMonths: 36, percent: 30 },
        { overMonths: 36, upToMonths: 48, percent: 40 },
        { overMonths: 48, upToMonths: 60, percent: 50 },
      ],
      idvAboveFiveYears: "AGREED_INSURER_AND_INSURED_VALUE",
      salvage: {
        recordKeeper: true,
        policyholderRetainsWreckSettlement: "IDV_LESS_COMPETITIVELY_ASSESSED_SALVAGE",
        alwaysDeduct: false,
      },
      rcCancellationReportDays: 14,
      productTermsRequired: true,
      confidence: "confirmed by primary insurer wording; universal application is UNVERIFIED",
      uiNotice: SAMPLE_VALUE_NOTICE,
    },

    // No regulator-mandated interim-payment percentage was located. Configurable demo
    // default only — checked 2026-09-21.
    workflowDefaults: {
      operationalTargetDays: numberFromEnv(env, "OPERATIONAL_TARGET_DAYS", 7),
      maxAppeals: numberFromEnv(env, "MAX_CLAIM_APPEALS", 2),
      onAccountPaymentPercent: numberFromEnv(env, "ON_ACCOUNT_PAYMENT_PERCENT", 50),
      confidence: "UNVERIFIED",
      uiNotice: SAMPLE_VALUE_NOTICE,
    },

    // IRDAI master circular Part V.2 plus current ICICI/HDFC claim forms.
    // https://www.icicilombard.com/docs/default-source/other-documents/motor_claim_form.pdf
    // https://www.hdfcergo.com/documents/crosslink/HDFC%20Motor%20Claim%20Form.pdf
    // checked 2026-09-21. “Conditional” means absence must not block intimation.
    claimDocuments: {
      ownDamage: {
        documents: ["CLAIM_FORM", "POLICY", "RC", "DRIVING_LICENCE", "ESTIMATE", "PHOTOS"],
        reimbursementOnly: ["FINAL_INVOICE", "PAYMENT_RECEIPT"],
        fir: "CONDITIONAL",
      },
      thirdParty: {
        documents: ["CLAIM_FORM", "POLICY", "RC", "DRIVING_LICENCE", "FIR", "LEGAL_OR_MACT_NOTICE"],
        fir: "REQUIRED",
      },
      theft: {
        documents: [
          "CLAIM_FORM",
          "POLICY",
          "RC",
          "ALL_KEYS",
          "FIR",
          "FINAL_OR_UNTRACED_POLICE_REPORT",
          "RTO_TRANSFER_OR_CANCELLATION_PAPERS",
          "FINANCIER_NOC_IF_APPLICABLE",
        ],
        fir: "REQUIRED",
      },
      fire: {
        documents: ["CLAIM_FORM", "POLICY", "RC", "PHOTOS", "FIRE_BRIGADE_REPORT_IF_APPLICABLE", "ESTIMATE"],
        fir: "CONDITIONAL_UNVERIFIED",
      },
      flood: {
        documents: ["CLAIM_FORM", "POLICY", "RC", "PHOTOS", "ESTIMATE"],
        fir: "CONDITIONAL_UNVERIFIED",
      },
      neverBlockIntimationForMissingDocuments: true,
      confidence: "confirmed by primary sources except fire/flood universal FIR rules, which are UNVERIFIED",
    },

    // IRDAI master circular, Part VI, effective 2024-09-05, checked 2026-09-21.
    // https://irdai.gov.in/document-detail?documentId=5625747
    grievance: {
      acknowledge: "IMMEDIATE",
      insurerResolutionDays: 14,
      bimaBharosaPublicEscalationDays: 15,
      ombudsmanNoReplyEligibilityMonths: 1,
      ombudsmanMaximumClaimPaise: 5_000_000_000,
      insurerAwardComplianceDays: 30,
      awardDelayPenaltyPaisePerDay: 500_000,
      ombudsmanAwardMonthsAfterAllRequirements: 3,
      ombudsmanMediationRecommendationMonths: 1,
      ombudsmanFilingLimitYears: 1,
      confidence: "confirmed by primary source",
    },

    // DPDP Rules, 2025, rules 6–8, gazetted 2025-11-14; rules 3 and 5–16
    // commence 18 months later. https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
    // Commencement: https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf
    // checked 2026-09-21.
    privacy: {
      substantiveDutiesCommenceOn: "2027-05-14",
      consentManagerProvisionCommencesOn: "2026-11-14",
      securityAndProcessingLogMinimumDays: 365,
      affectedPersonBreachNotice: "WITHOUT_DELAY",
      boardInitialBreachNotice: "WITHOUT_DELAY",
      boardDetailedBreachReportHours: 72,
      eraseWhenPurposeEndsOrConsentWithdrawnUnlessLawRequiresRetention: true,
      useAsFutureReadyBaselineBeforeCommencement: true,
      confidence: "confirmed by primary source",
    },
  });

export const rules = getConfiguredRules();

export default rules;
