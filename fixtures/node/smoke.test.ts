import { expect, test } from "@playwright/test";

import { setupTest } from "../test-helpers";

test("basic smoke test dev", async ({ page: _page }) => {
  using page = await setupTest(_page, "dev", import.meta.dirname);

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(await response?.json()).toEqual({
    clientOnlyValue: "client-only-value",
    server: {
      serverOnlyValue: "server-only-value",
      sharedValue: "shared-value",
      value: "server-value",
    },
    sharedValue: "shared-value",
    value: "client-value",
  });
});

test("basic smoke test prod", async ({ page: _page }) => {
  using page = await setupTest(_page, "prod", import.meta.dirname);

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(await response?.json()).toEqual({
    clientOnlyValue: "client-only-value",
    server: {
      serverOnlyValue: "server-only-value",
      sharedValue: "shared-value",
      value: "server-value",
    },
    sharedValue: "shared-value",
    value: "client-value",
  });
});
