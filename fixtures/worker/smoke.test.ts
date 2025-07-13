import { expect, test } from "vitest";

import Worker from "./src/entry.worker?worker";

test("basic smoke test", async () => {
  const result = await new Promise<unknown>((resolve, reject) => {
    try {
      const worker = new Worker();
      worker.addEventListener("message", (event) => {
        resolve(event.data);
      });
      worker.addEventListener("error", reject);
      worker.addEventListener("messageerror", reject);
    } catch (error) {
      reject(error);
    }
  });

  expect(result).toEqual({
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
