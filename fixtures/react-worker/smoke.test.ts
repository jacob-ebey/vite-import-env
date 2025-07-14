import { expect, test, vi } from "vitest";

import { hydrateClient } from "./src/entry.client";

test("basic smoke test", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  await hydrateClient(container);
  await vi.waitUntil(() => container.innerHTML !== "");

  expect(container.innerHTML).toBe("<h1>Hello from the server!</h1>");
});
