import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await fs.mkdir(".local/screenshots", { recursive: true });
async function check(path) {
  await page.goto("http://localhost:5173" + path);
  await page.waitForLoadState("networkidle");
  assert.ok(
    (await page.locator("main").innerText()).length > 50,
    "Blank page: " + path,
  );
  assert.equal(
    await page.locator("[data-load-error]").count(),
    0,
    "Error boundary: " + path,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Horizontal page overflow: " + path,
  );
  console.log("PASS " + path);
}
try {
  for (const path of [
    "/",
    "/how-it-works",
    "/services",
    "/claim-eligibility",
    "/required-documents",
    "/faq",
    "/about",
    "/contact",
    "/login",
    "/register",
    "/not-a-page",
  ])
    await check(path);
  await page.goto("http://localhost:5173/");
  await page.screenshot({
    path: ".local/screenshots/home-desktop.png",
    fullPage: true,
  });
  for (const [role, name] of [
    ["customer", "Policyholder"],
    ["surveyor", "Surveyor"],
    ["admin", "Admin"],
    ["superadmin", "Super Admin"],
  ]) {
    await page.goto("http://localhost:5173/login");
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", { name: "Log in to your workspace" })
      .click();
    await page.waitForURL("**/portal");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `.local/screenshots/${role}-dashboard.png`,
      fullPage: true,
    });
    for (const route of [
      "/portal",
      "/portal/claims",
      "/portal/documents",
      "/portal/inspections",
      "/portal/notifications",
      "/portal/profile",
      ...(role === "customer"
        ? ["/portal/vehicles", "/portal/claims/new"]
        : role === "admin"
          ? ["/portal/users", "/portal/audit"]
          : role === "superadmin"
            ? ["/portal/users", "/portal/staff", "/portal/staff-approvals", "/portal/audit"]
          : []),
    ])
      await check(route);
    if (role === "customer") {
      await page.goto("http://localhost:5173/portal/vehicles");
      await page.getByRole("link", { name: "Vehicle care" }).first().click();
      await page.waitForLoadState("networkidle");
      assert.equal(await page.locator("[data-load-error]").count(), 0);
      assert.ok(page.url().includes("/portal/vehicles/"));
    }
    await page.goto("http://localhost:5173/portal/claims");
    await page.waitForLoadState("networkidle");
    await page.locator(".claim-link").first().click();
    await page.waitForLoadState("networkidle");
    for (const tab of [
      "Overview",
      "Evidence",
      "Inspection",
      "Decision & appeal",
      "Timeline",
    ]) {
      await page
        .getByRole("button", { name: tab, exact: tab !== "Evidence" })
        .click();
      assert.equal(await page.locator("[data-load-error]").count(), 0);
    }
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.ok(
      page.url().includes("/portal/claims/"),
      "Protected refresh must keep session",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/portal", "/portal/claims", "/portal/profile"])
      await check(route);
    await page.goto("http://localhost:5173/portal");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: `.local/screenshots/${role}-mobile.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForURL("**/login");
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/login", "/register", "/required-documents"])
    await check(route);
  await page.goto("http://localhost:5173/");
  await page.screenshot({
    path: ".local/screenshots/home-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(
    "PASS: all public pages, all role portals, claim tabs, protected refresh and mobile overflow checks.",
  );
} finally {
  await browser.close();
}
