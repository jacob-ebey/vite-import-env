import "client-only";

import { clientOnlyValue } from "./client-only";
import { sharedValue } from "./shared";

import { server } from "./entry.server" with { env: "server" };

export default {
  fetch: (request: Request) => {
    return new Response(
      JSON.stringify({
        clientOnlyValue,
        server,
        sharedValue,
        value: "client-value",
      })
    );
  },
};
