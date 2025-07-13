import { expect, test } from "vitest";

import { client } from "./src/entry.client";

test("basic smoke test", () => {
  expect(client()).toEqual({
    clientOnlyValue: "client-only-value",
    server: {
      clientOnlyValue: "client-only-value",
      serverOnlyValue: "server-only-value",
      sharedValue: "shared-value",
      value: "server-value",
    },
    sharedValue: "shared-value",
    value: "client-value",
  });
});
