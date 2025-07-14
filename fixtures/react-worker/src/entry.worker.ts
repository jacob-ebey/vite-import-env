import { handleFetchEvent } from "./fetch-transport/server";
import { fetchServer } from "./entry.server" with { env: "server" };

handleFetchEvent(fetchServer);
