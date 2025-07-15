import "client-only";

import Worker from "./entry.worker.ts?nodeWorker";
import { fetchWorker } from "./fetch-transport/client";

const worker = new Worker();

export default {
  fetch: (request: Request) => {
    return fetchWorker(worker, request);
  },
};
