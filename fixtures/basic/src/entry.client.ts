import "client-only";

import { clientOnlyValue } from "./client-only";
import { sharedValue } from "./shared";

import { server } from "./entry.server" with { env: "server" };

export const client = () => ({
  clientOnlyValue,
  server,
  sharedValue,
  value: "client-value",
});

if (typeof document !== "undefined") {
  const target = document.querySelector("#result");
  if (target) {
    target.textContent = JSON.stringify(client(), null, 2);
  }
}
