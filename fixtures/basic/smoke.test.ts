import { expect, test } from "@playwright/test";

import { setupTest } from "../test-helpers";

test("basic smoke test dev", async ({ page: _page }) => {
  using page = await setupTest(_page, "dev", import.meta.dirname);

  await page.goto("/");

  await expect(page.locator("#result")).toContainText(
    JSON.stringify(
      {
        clientOnlyValue: "client-only-value",
        server: {
          serverOnlyValue: "server-only-value",
          sharedValue: "shared-value",
          value: "server-value",
        },
        sharedValue: "shared-value",
        value: "client-value",
      },
      null,
      2
    )
  );

  expect(true).toBe(true);
});

test("basic smoke test prod", async ({ page: _page }) => {
  using page = await setupTest(_page, "prod", import.meta.dirname);

  await page.goto("/");

  await expect(page.locator("#result")).toContainText(
    JSON.stringify(
      {
        clientOnlyValue: "client-only-value",
        server: {
          serverOnlyValue: "server-only-value",
          sharedValue: "shared-value",
          value: "server-value",
        },
        sharedValue: "shared-value",
        value: "client-value",
      },
      null,
      2
    )
  );

  expect(true).toBe(true);
});
