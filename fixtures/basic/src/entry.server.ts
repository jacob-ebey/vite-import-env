import "server-only";

import { clientOnlyValue } from "./client-only" with { env: "client" };
import { serverOnlyValue } from "./server-only";
import { sharedValue } from "./shared";

export const server = {
  clientOnlyValue,
  serverOnlyValue,
  sharedValue,
  value: "server-value",
};
