import { type Page } from "@playwright/test";
import { $, type ResultPromise } from "execa";
import getPort from "get-port";
import waitOn from "wait-on";

const references = {
  dev: {
    count: 0,
    promise: null as Promise<{ command: ResultPromise; port: number }> | null,
  },
  prod: {
    count: 0,
    promise: null as Promise<{ command: ResultPromise; port: number }> | null,
  },
};

export async function setupTest(
  _page: Page,
  mode: "dev" | "prod",
  cwd: string
): Promise<Page & Disposable> {
  references[mode].count++;

  const promise = (references[mode].promise = (async () => {
    const port = await getPort();

    if (mode === "prod") {
      await $({
        cwd,
        // stdout: process.stdout,
      })`pnpm build`;
    }

    const command =
      mode === "dev"
        ? $({
            cwd,
            // stdout: process.stdout,
          })`pnpm dev --port=${port}`
        : $({
            cwd,
            // stdout: process.stdout,
          })`pnpm start --port=${port}`;

    await waitOn({ resources: [`http://localhost:${port}`], delay: 250 });

    return { command, port };
  })());

  const { command, port } = await promise;

  const ogGoto = _page.goto.bind(_page);

  return Object.assign(_page, {
    goto: ((url, options) => {
      if ((typeof url === "string" && url === "/") || url.startsWith("/")) {
        return ogGoto(`http://localhost:${port}${url}`, options);
      }
      return ogGoto(url, options);
    }) satisfies Page["goto"],
    [Symbol.dispose]: () => {
      // TODO: Maybe cleanup the server?
    },
  });
}
