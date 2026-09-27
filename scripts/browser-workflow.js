import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseURL = process.env.BROWSER_TEST_URL || "http://localhost:5173";
const target = process.argv[2];
if (target !== "--create" && !/^[a-f0-9]{24}$/.test(target || ""))
  throw new Error("Usage: node scripts/browser-workflow.js --create | <existing-claim-id>. --create adds a claim to the local demo database.");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function logIn(role) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByRole("button", { name: "Log in to your workspace" }).click();
  await page.waitForURL("**/portal");
}

async function upload(type, file) {
  await page.getByLabel("Evidence type").selectOption(type);
  await page.getByLabel("Choose file").setInputFiles(file);
  await page.getByRole("button", { name: "Upload evidence" }).click();
  await page.getByText(type, { exact: true }).last().waitFor();
}

const pdf = {
  name: "workflow-check.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\nUI workflow verification\n%%EOF"),
};
const png = {
  name: "workflow-check.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl5Yx0AAAAASUVORK5CYII=", "base64"),
};

try {
  let claimURL = target !== "--create"
    ? `${baseURL}/portal/claims/${target}`
    : "";
  let claimNumber = "";
  if (!claimURL) {
  await logIn("Policyholder");
  await page.goto(`${baseURL}/portal/claims/new`);
  await page.getByRole("heading", { name: "Vehicle", exact: true }).waitFor();
  await page.locator('.selection-card input[type="radio"]').first().check();
  await page.locator('.policy-choice input[type="radio"]:checked').waitFor();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Incident & damage" }).waitFor();
  await page.getByLabel("Estimated loss (₹)").fill("60000");
  await page.getByLabel("Accident date").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Accident time").fill("14:35");
  await page.getByLabel("Location", { exact: true }).fill("Vasai West, Mumbai");
  await page.getByLabel("Nearby landmark").fill("Railway station");
  await page.getByLabel("What happened? (at least 50 characters)").fill(
    "UI workflow verification: a low speed collision near the station damaged the front bumper and headlamp. No one was injured.",
  );
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Police details" }).waitFor();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Photos" }).waitFor();
  await upload("Front damage photograph", png);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Documents" }).waitFor();
  for (const type of ["Registration Certificate", "Driving licence", "Insurance policy"])
    await upload(type, pdf);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("heading", { name: "Review & submit" }).waitFor();
  await page.locator('.declaration input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Submit claim" }).click();
  await page.waitForURL(/\/portal\/claims\/[a-f0-9]{24}$/);
  claimURL = page.url();
  await page.locator(".page-heading h1").filter({ hasText: /^GC-/ }).waitFor();
  claimNumber = await page.locator(".page-heading h1").innerText();
  await page.getByText("Submitted", { exact: true }).first().waitFor();
  console.log(`PASS policyholder submission, photo/document uploads and tracking: ${claimNumber}`);

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  }
  await logIn("Admin");
  await page.goto(claimURL);
  if (!claimNumber) {
    await page.locator(".page-heading h1").filter({ hasText: /^GC-/ }).waitFor();
    claimNumber = await page.locator(".page-heading h1").innerText();
  }
  await page.getByRole("heading", { name: claimNumber }).waitFor();
  if (await page.getByText("Submitted", { exact: true }).first().isVisible()) {
    const review = page.locator(".action-form").filter({ has: page.getByRole("heading", { name: "Move this claim forward" }) });
    await review.getByLabel("Next status").selectOption("UNDER_REVIEW");
    await review.getByLabel("Explanation / information requested").fill("Evidence received; begin assessment and assign a surveyor.");
    await review.getByRole("button", { name: "Update status" }).click();
    await page.getByText("Under Review", { exact: true }).first().waitFor();
  }
  if (await page.getByText("Under Review", { exact: true }).first().isVisible()) {
    const assign = page.locator(".action-form").filter({ has: page.getByRole("heading", { name: "Assign a surveyor" }) });
    await assign.getByLabel("Available surveyor").selectOption({ index: 1 });
    await assign.getByRole("button", { name: "Assign surveyor" }).click();
    await page.getByText("Surveyor Assigned", { exact: true }).first().waitFor();
    console.log("PASS admin review and surveyor assignment");
  }

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await logIn("Surveyor");
  await page.goto(claimURL);
  await page.getByRole("heading", { name: claimNumber }).waitFor();
  if (await page.getByText("Surveyor Assigned", { exact: true }).first().isVisible()) {
    const schedule = page.locator(".action-form").filter({ has: page.getByRole("heading", { name: "Schedule inspection" }) });
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
    await schedule.getByLabel("Inspection date and time").fill(tomorrow);
    await schedule.getByLabel("Inspection location").fill("Vasai West service centre");
    await schedule.getByRole("button", { name: "Schedule inspection" }).click();
    await page.getByText("Inspection Scheduled", { exact: true }).first().waitFor();
    console.log("PASS surveyor inspection scheduling");
  }
  if (await page.getByText("Inspection Scheduled", { exact: true }).first().isVisible()) {
    const report = page.locator(".action-form").filter({ has: page.getByRole("heading", { name: "Submit inspection report" }) });
    await report.getByLabel("Visible damage observations").fill("The front bumper and left headlamp show collision damage consistent with the reported incident.");
    await report.getByLabel("Affected parts (comma-separated)").fill("Front bumper, left headlamp");
    await report.getByLabel("Parts cost (₹)").fill("20000");
    await report.getByLabel("Labour cost (₹)").fill("5000");
    await report.getByLabel("Applicable tax (₹)").fill("4500");
    await report.getByLabel("Professional notes").fill("Repair estimate reflects the observed damage.");
    await report.getByRole("button", { name: "Submit report" }).click();
    await page.getByText("Inspection Completed", { exact: true }).first().waitFor();
    console.log("PASS surveyor inspection report");
  }
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await logIn("Admin");
  await page.goto(claimURL);
  await page.getByRole("heading", { name: claimNumber }).waitFor();
  if (await page.getByText("Inspection Completed", { exact: true }).first().isVisible()) {
    const decision = page.locator(".action-form").filter({ has: page.getByRole("heading", { name: "Record decision" }) });
    await decision.getByLabel("Outcome").selectOption("APPROVED");
    await decision.getByLabel("Clear decision reason").fill("Inspection confirms covered collision damage and repair costs.");
    await decision.getByLabel("Referenced sample policy clause").fill("Sample OD-4");
    await decision.getByRole("button", { name: "Record decision" }).click();
    await page.getByText("Approved", { exact: true }).first().waitFor();
    console.log("PASS admin decision and settlement calculation");
  }
  assert.equal((await page.locator(".page-heading .badge").innerText()).trim(), "Approved");
  await page.getByRole("button", { name: "Workflow & payout" }).click();
  await page.locator(".calculation .total").waitFor();
  assert.match(await page.locator(".calculation .total").innerText(), /Net payable/);
  assert.deepEqual(errors, [], "Browser runtime errors");
} finally {
  await browser.close();
}
