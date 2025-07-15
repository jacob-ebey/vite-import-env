import "server-only";

import { serverOnlyValue } from "./server-only";
import { sharedValue } from "./shared";

export async function fetchServer(request: Request) {
  return {
    serverOnlyValue,
    sharedValue,
    value: "server-value",
  };
}
