import "client-only";

import { clientOnlyValue } from "./client-only";
import { fetchServer } from "./entry.server" with { env: "server" };
import { handleFetchEvent } from "./fetch-transport/server";
import { sharedValue } from "./shared";

handleFetchEvent(async (request) => {
  return new Response(
    JSON.stringify({
      clientOnlyValue,
      server: await fetchServer(request),
      sharedValue,
      value: "client-value",
    })
  );
});
