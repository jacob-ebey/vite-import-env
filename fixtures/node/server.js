import { createServer } from "node:http";
import { parseArgs } from "node:util";

import { createRequestListener } from "@mjackson/node-fetch-server";

import build from "./dist/entry.ssr.js";

const server = createServer(createRequestListener(build.fetch));

const {
  values: { port: _port },
} = parseArgs({
  options: {
    port: {
      type: "string",
      default: "3000",
    },
  },
});

const port = parseInt(_port, 10);

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log("Press Ctrl+C to stop the server.");
});
