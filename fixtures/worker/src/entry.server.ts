import "server-only";

import { serverOnlyValue } from "./server-only";
// import { sharedValue } from "./shared";

export const server = {
  serverOnlyValue,
  // sharedValue,
  value: "server-value",
};
