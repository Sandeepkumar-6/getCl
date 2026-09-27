import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

// Read-only live smoke checks, then controlled response fixtures for sparse/error states.
// No demo records are created, changed or deleted by this script.
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], failedApis = [];
let expectedFailure = false;
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => { if (!expectedFailure && response.url().includes("/api/") && response.status() >= 400) failedApis.push(`${response.status()} ${response.url()}`); });
const origin = "http://localhost:5173";
async function check(path) {
  await page.goto(origin + path);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator("[data-load-error]").count(), 0, path);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow: ${path}, ${page.viewportSize().width}`);
  assert.ok((await page.locator("main").innerText()).length > 80);
}
try {
  await fs.mkdir(".local/screenshots", { recursive: true });
  await page.goto(origin + "/login");
  await page.getByRole("button", { name: "Policyholder", exact: true }).click();
  await page.getByRole("button", { name: "Log in to your workspace" }).click();
  await page.waitForURL("**/portal");
  await page.waitForLoadState("networkidle");
  const token = await page.evaluate(() => localStorage.getItem("getclaim-token"));
  const response = await page.request.get(origin + "/api/vehicles?includePolicies=true", { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status(), 200);
  const vehicles = await response.json();
  assert.ok(vehicles.length > 1, "Live multiple-vehicle account");
  const vehicle = vehicles[0];
  const careResponse = await page.request.get(`${origin}/api/vehicles/${vehicle._id}/care`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(careResponse.status(), 200);
  const care = await careResponse.json();
  await page.getByLabel("Viewing vehicle").selectOption(vehicles[1]._id);
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".owner-vehicle-card")).toContainText(vehicles[1].registrationNumber);
  await page.reload();
  await expect(page.locator(".owner-vehicle-card")).toContainText(vehicles[1].registrationNumber);
  console.log("PASS multi-vehicle switch, refresh and selected record isolation");

  const routes = ["/portal", "/portal/vehicle", "/portal/insurance", "/portal/documents", "/portal/reminders", `/portal/vehicles/${vehicle._id}`, `/portal/claims?vehicleId=${vehicle._id}`];
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) await check(route);
    console.log(`PASS new workspace routes at ${width}px`);
    if ([1440, 390].includes(width)) {
      await check("/portal");
      await page.screenshot({ path: `.local/screenshots/vehicle-workspace-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await check(`/portal/documents?vehicleId=${vehicle._id}`);
  for (const category of ["Vehicle", "Policy", "Claim", "Service", "All"]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    await expect(page.getByRole("button", { name: category, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  if (care.documentLibrary.length) {
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: `Download ${care.documentLibrary[0].name}`, exact: true }).first().click();
    const download = await downloadEvent;
    assert.equal(await download.failure(), null);
  }
  for (const [action, title] of [["service", "Add service record"], ["document", "Upload vehicle document"], ["reminder", "Add reminder"], ["mileage", "Update mileage"], ["check", "Record monthly check"]]) {
    await check(`/portal/vehicles/${vehicle._id}?action=${action}`);
    await expect(page.getByRole("dialog", { name: title })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    assert.equal(await page.getByRole("dialog").count(), 0);
  }
  await check(`/portal/insurance?vehicleId=${vehicle._id}&add=policy`);
  await expect(page.locator(".form-card")).toContainText("Add policy");
  await check(`/portal/claims/new?vehicleId=${vehicle._id}`);
  await expect(page.locator("main")).toContainText(vehicle.registrationNumber);
  console.log("PASS document categories/download, policy form, claim entry and all care actions");

  // All remaining fixtures are browser-only. The live database stays unchanged.
  let mode = "single";
  const emptyCare = { vehicle: { ...vehicle, manufacturer: "Test", model: "Uncatalogued", photo: undefined }, policies: [], claims: [], services: [], checks: [], reminders: [], documents: [], documentLibrary: [], timeline: [] };
  delete emptyCare.vehicle.nextServiceDueAt;
  await page.route("**/api/vehicles?*", async route => {
    if (mode === "loading") await new Promise(resolve => setTimeout(resolve, 1200));
    if (mode === "error") return route.fulfill({ status: 503, json: { message: "Test service unavailable" } });
    const requestUrl = new URL(route.request().url());
    const items = mode === "zero" ? [] : [emptyCare.vehicle];
    const body = requestUrl.searchParams.has("page")
      ? { items, page: 1, pages: 1, total: items.length, limit: Number(requestUrl.searchParams.get("limit")) || 12 }
      : items;
    await route.fulfill({ json: body });
  });
  await page.route(`**/api/vehicles/${vehicle._id}/care`, route => route.fulfill({ json: emptyCare }));
  await check("/portal");
  assert.equal(await page.getByLabel("Viewing vehicle").count(), 0);
  for (const text of ["No active claims for this vehicle.", "No policy added yet", "No service records yet", "You’re up to date.", "No documents yet", "No activity yet"]) await expect(page.locator("main")).toContainText(text);
  await page.screenshot({ path: ".local/screenshots/vehicle-workspace-empty.png", fullPage: true });
  mode = "zero";
  await check("/portal");
  await page.getByRole("link", { name: "Add my vehicle" }).click();
  await expect(page.locator(".form-card")).toContainText("Add vehicle");
  mode = "loading";
  await page.goto(origin + "/portal");
  await expect(page.getByLabel("Loading vehicle overview")).toBeVisible();
  await page.waitForLoadState("networkidle");
  mode = "error"; expectedFailure = true;
  await page.goto(origin + "/portal");
  await expect(page.getByRole("alert")).toContainText("Test service unavailable");
  mode = "single";
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".owner-vehicle-card")).toBeVisible();
  expectedFailure = false;
  assert.deepEqual(errors, [], "Browser runtime errors");
  assert.deepEqual(failedApis, [], "Unexpected API errors");
  console.log("PASS one/zero vehicle, no claim/policy/service/document/reminder/activity, image fallback, loading, error and retry states");
} finally { await browser.close(); }
