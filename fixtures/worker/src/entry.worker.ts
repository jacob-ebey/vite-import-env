import "client-only";

import { clientOnlyValue } from "./client-only";
import { sharedValue } from "./shared";

import { server } from "./entry.server" with { env: "server" };

const client = () => ({
  clientOnlyValue,
  server,
  sharedValue,
  value: "client-value",
});

postMessage(client());
