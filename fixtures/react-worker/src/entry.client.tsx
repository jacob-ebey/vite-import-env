import "client-only";

import * as React from "react";
import { createRoot } from "react-dom/client";

import { fetchWorker } from "./fetch-transport/client";
import Worker from "./entry.worker?worker";

// @ts-expect-error - polyfill webpack global
globalThis.__webpack_require__ = () => {};

const worker = new Worker();

function Root({ root }: { root: any }) {
  return <>{React.use(root)}</>;
}

export async function hydrateClient(target: Element) {
  const fetchPromise = fetchWorker(worker, new Request(location.href));

  const { createFromFetch } = await import(
    // @ts-expect-error - no types for this package
    "react-server-dom-webpack/client.browser"
  );

  const root = createFromFetch(fetchPromise);

  createRoot(target).render(
    <React.StrictMode>
      <Root root={root} />
    </React.StrictMode>
  );
}

if (typeof document !== "undefined") {
  const target = document.querySelector("#result");
  if (target) hydrateClient(target);
}
