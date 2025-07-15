import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import * as vite from "vite";
import type { SourceMapInput } from "rollup";
import MagicString from "magic-string";

const nodeWorkerAssetUrlRE = /__VITE_NODE_WORKER_ASSET__([\w$]+)__/g;

/**
 * Resolve `?nodeWorker` import and automatically generate `Worker` wrapper.
 */
export function nodeWorker(): vite.PluginOption[] {
  let sourcemap: boolean | "inline" | "hidden" = false;

  let waitForDevServer: PromiseWithResolvers<string> = Promise.withResolvers();

  return [
    vitePluginFetchModuleServer(),
    {
      name: "vite:node-worker",
      apply: "serve",
      enforce: "pre",
      configureServer(server) {
        server.httpServer!.once("listening", () => {
          const address = server.httpServer!.address();
          if (!address) {
            throw new Error("Server address is not available");
          }
          const baseURL =
            typeof address === "string"
              ? `http://${address}`
              : `http://localhost:${address.port}`;
          waitForDevServer.resolve(baseURL);
        });
      },
      async load(id) {
        const query = parseRequest(id);
        if (query && typeof query.nodeWorker === "string") {
          const [entryScript, runnerScript] = await Promise.all([
            fsp.readFile(
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "worker-entry.js"
              ),
              "utf8"
            ),
            fsp.readFile(
              path.resolve(
                path.dirname(fileURLToPath(import.meta.url)),
                "worker-runner.js"
              ),
              "utf8"
            ),
          ]);

          const baseURL = await waitForDevServer.promise;

          const options = {
            root: this.environment.config.root,
            environmentName: this.environment.name,
            baseURL,
          };

          const runner = runnerScript
            .replace("___ENTRYPOINT___", JSON.stringify(cleanUrl(id)))
            .replace("___OPTIONS___", JSON.stringify(options));

          return entryScript.replace(
            "___WORKER_CONTENT___",
            JSON.stringify(runner)
          );
        }
      },
    },
    {
      name: "vite:node-worker",
      apply: "build",
      enforce: "pre",
      configResolved(config): void {
        sourcemap = config.build.sourcemap;
      },
      resolveId(id, importer): string | void {
        const query = parseRequest(id);
        if (query && typeof query.nodeWorker === "string") {
          return id + `&importer=${importer}`;
        }
      },
      load(id): string | void {
        const query = parseRequest(id);
        if (
          query &&
          typeof query.nodeWorker === "string" &&
          typeof query.importer === "string"
        ) {
          const cleanPath = cleanUrl(id);
          const hash = this.emitFile({
            type: "chunk",
            id: cleanPath,
            importer: query.importer,
          });
          const assetRefId = `__VITE_NODE_WORKER_ASSET__${hash}__`;
          return `
        import { Worker } from 'node:worker_threads';
        export default function (options) { return new Worker(new URL(${assetRefId}, import.meta.url), options); }`;
        }
      },
      renderChunk(code, chunk): { code: string; map: SourceMapInput } | null {
        if (code.match(nodeWorkerAssetUrlRE)) {
          let match: RegExpExecArray | null;
          const s = new MagicString(code);

          while ((match = nodeWorkerAssetUrlRE.exec(code))) {
            const [full, hash] = match;
            const filename = this.getFileName(hash);
            const outputFilepath = toRelativePath(filename, chunk.fileName);
            const replacement = JSON.stringify(outputFilepath);
            s.overwrite(match.index, match.index + full.length, replacement, {
              contentOnly: true,
            });
          }

          return {
            code: s.toString(),
            map: sourcemap ? s.generateMap({ hires: "boundary" }) : null,
          };
        }

        return null;
      },
    },
  ];
}

function vitePluginFetchModuleServer(): vite.Plugin {
  return {
    name: vitePluginFetchModuleServer.name,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "https://any.local");
        if (url.pathname === "/@vite/invoke") {
          const [name, payload] = JSON.parse(url.searchParams.get("data")!);
          const devEnv = server.environments[name]!;
          const result = await devEnv.hot.handleInvoke(payload);
          res.end(JSON.stringify(result));
          return;
        }
        next();
      });
    },
  };
}

const queryRE = /\?.*$/s;
const hashRE = /#.*$/s;

const cleanUrl = (url: string): string =>
  url.replace(hashRE, "").replace(queryRE, "");

function parseRequest(id: string): Record<string, string> | null {
  const { search } = new URL(id, "file:");
  if (!search) {
    return null;
  }
  return Object.fromEntries(new URLSearchParams(search));
}

function toRelativePath(filename: string, importer: string): string {
  const relPath = path.posix.relative(path.dirname(importer), filename);
  return relPath.startsWith(".") ? relPath : `./${relPath}`;
}
