import "client-only";

import { fetchWorker } from "./fetch-transport/client";

// @ts-expect-error
import Worker from "./entry.worker.ts?nodeWorker";

const worker = new Worker();

export default {
  fetch: (request: Request) => {
    return fetchWorker(worker, request);
  },
};
