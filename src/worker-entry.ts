import { Worker as BaseWorker, type WorkerOptions } from "node:worker_threads";

declare const ___WORKER_CONTENT___: string;

export default class Worker extends BaseWorker {
  constructor(options?: WorkerOptions) {
    super(___WORKER_CONTENT___, { ...options, eval: true });
  }
}
