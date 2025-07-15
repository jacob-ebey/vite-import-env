import { createHash } from "node:crypto";
import * as path from "node:path";

import * as esrap from "esrap";
import ts from "esrap/languages/ts";
import tsx from "esrap/languages/tsx";
import * as oxc from "oxc-parser";
import * as vite from "vite";

export { nodeWorker } from "./node-worker-plugin";

function alwaysSkip(id: string): boolean {
  return id.startsWith("\0vite");
}

function isValidScriptFile(id: string): boolean {
  const [idWithoutQuery] = id.split("?");
  return (
    !alwaysSkip(id) &&
    (idWithoutQuery.endsWith(".mts") ||
      idWithoutQuery.endsWith(".ts") ||
      idWithoutQuery.endsWith(".tsx") ||
      idWithoutQuery.endsWith(".mjs") ||
      idWithoutQuery.endsWith(".js") ||
      idWithoutQuery.endsWith(".jsx"))
  );
}

function isJSXFile(id: string): boolean {
  const [idWithoutQuery] = id.split("?");
  return idWithoutQuery.endsWith(".jsx") || idWithoutQuery.endsWith(".tsx");
}

function mergeRollupInputs(
  inputs: vite.Rollup.InputOption,
  ensureEntries: Map<string, string>
) {
  // Normalize inputs to an object
  let normalizedInputs: Record<string, string> =
    Object.fromEntries(ensureEntries);

  if (typeof inputs === "string") {
    normalizedInputs = {
      [path.basename(inputs, path.extname(inputs))]: inputs,
    };
  } else if (Array.isArray(inputs)) {
    normalizedInputs = Object.assign(
      normalizedInputs,
      Object.fromEntries(
        inputs.map((input) => [
          path.basename(input, path.extname(input)),
          input,
        ])
      )
    );
  } else {
    normalizedInputs = Object.assign(normalizedInputs, inputs);
  }

  return normalizedInputs;
}

export type ImportEnvAPI = {
  mergeEntries: (env: vite.BuildEnvironment) => void;
};

export function importEnv(): vite.PluginOption[] {
  let resolvedConfig: vite.ResolvedConfig | undefined;
  const environmentEntries: Record<string, Map<string, string>> = {};
  const entryAssets: Record<
    string,
    { base: string; file: string; outDir: string }
  > = {};
  const missingAssets: Set<string> = new Set();

  function getResolver(env: string) {
    if (!resolvedConfig) {
      throw new Error("Resolved config is not available yet.");
    }

    const envConfig = resolvedConfig.environments?.[env];
    if (!envConfig) {
      throw new Error(`Environment '${env}' is not defined in the config.`);
    }

    return (id: string, importer?: string) =>
      vite.createIdResolver(resolvedConfig!, envConfig.resolve)(
        {
          config: {
            ...resolvedConfig,
            ...envConfig,
          } as any,
          getTopLevelConfig: () => resolvedConfig!,
          logger: resolvedConfig!.logger,
          name: env,
        },
        id,
        importer
      );
  }

  let updateEntries = () => {};

  return [
    {
      name: "import-attributes-to-query",
      enforce: "pre",
      transform(code, id) {
        if (!isValidScriptFile(id)) {
          // console.info(
          //   `[import-attributes-to-query] Skipping transformation of: ${id}`
          // );
          return;
        }

        const [idWithoutQuery] = id.split("?");
        const ast = oxc.parseSync(idWithoutQuery, code, {
          astType: "ts",
          preserveParens: true,
          lang: isJSXFile(id) ? "tsx" : "ts",
        });

        for (const node of ast.program.body) {
          switch (node.type) {
            case "ImportDeclaration":
              let index = -1;
              for (const attribute of node.attributes) {
                index++;
                if (
                  attribute.key.type === "Identifier" &&
                  attribute.key.name === "env"
                ) {
                  if (attribute.value.type !== "Literal") {
                    throw new Error(
                      `Expected 'env' attribute value to be a string literal, but got ${attribute.value.type} in ${id}`
                    );
                  }
                  const envValue = attribute.value.value;

                  const [ogSource, ...ogQueryRest] =
                    node.source.value.split("?");
                  const query = new URLSearchParams(ogQueryRest.join("?"));
                  query.set("env", envValue);
                  node.source.value = `${ogSource}?${query.toString()}`;
                  node.source.raw = JSON.stringify(node.source.value);

                  node.attributes.splice(index, 1);
                  break;
                }
              }
          }
        }

        const generated = esrap.print(
          ast.program,
          isJSXFile(id) ? tsx() : ts()
        );

        return generated;
      },
    },
    {
      name: "import-env-builder",
      enforce: "post",
      config(userConfig) {
        return vite.mergeConfig<vite.UserConfig, vite.UserConfig>(userConfig, {
          builder: {
            sharedConfigBuild: true,
            sharedPlugins: true,
            async buildApp(builder) {
              updateEntries = () => {
                for (const env of Object.values(builder.environments)) {
                  env.config.build.rollupOptions.input = mergeRollupInputs(
                    originalValues[env.name].input ?? {},
                    environmentEntries[env.name] ?? new Map()
                  );
                }
              };

              const originalValues: Record<
                string,
                {
                  input: vite.Rollup.InputOption | undefined;
                  // manifest: string | boolean;
                  // write: boolean;
                }
              > = {};
              for (const env of Object.values(builder.environments)) {
                originalValues[env.name] ??= {
                  input: env.config.build.rollupOptions.input,
                };
              }
              await userConfig.builder?.buildApp?.(builder);

              updateEntries();

              await userConfig.builder?.buildApp?.(builder);

              if (missingAssets.size > 0) {
                const envs = new Set<string>();
                const findEnvironmentAndSource = (id: string) => {
                  for (const [envName, entries] of Object.entries(
                    environmentEntries
                  )) {
                    for (const [entryId, source] of entries.entries()) {
                      if (id === entryId) {
                        envs.add(envName);
                        return { envName, source };
                      }
                    }
                  }
                  return null;
                };

                for (const id of missingAssets) {
                  const found = findEnvironmentAndSource(id);
                  if (found) {
                    console.error(
                      `[import-env] Missing asset for environment '${found.envName}': ${found.source}`
                    );
                  } else {
                    console.error(
                      `[import-env] Missing asset: ${id} (no environment found)`
                    );
                  }
                }

                throw Error(
                  `Missing assets for environments: ${Array.from(envs).join(", ")}. Did you forget to build an environment?`
                );
              }
            },
          },
        });
      },
    },
    {
      name: "import-env",
      enforce: "pre",
      configResolved(config) {
        resolvedConfig = config;
      },
      async resolveId(source, importer) {
        const [ogSource, ...ogQueryRest] = source.split("?");
        const query = new URLSearchParams(ogQueryRest.join("?"));
        const env = query.get("env");

        if (env) {
          const resolver = getResolver(env);
          const resolved = await resolver(ogSource, importer);

          if (resolved) {
            if (this.environment.mode === "build") {
              environmentEntries[env] ??= new Map<string, string>();

              const id = `__IMPORT_ENV__${env}_${createHash("sha256").update(resolved).digest("hex").slice(0, 8)}`;

              environmentEntries[env].set(id, resolved);

              return {
                id,
                external: true,
              };
            } else {
              const [resolvedId, ...resolvedQueryRest] = resolved.split("?");
              const resolvedQuery = new URLSearchParams(
                resolvedQueryRest.join("?")
              );
              resolvedQuery.set("env", env);
              return `${resolvedId}?${resolvedQuery.toString()}`;
            }
          }
        }
      },
      transform(code, id) {
        if (!isValidScriptFile(id)) {
          // console.info(`[import-env] Skipping transformation of: ${id}`);
          return;
        }

        const [_, ...ogQueryRest] = id.split("?");
        const query = new URLSearchParams(ogQueryRest.join("?"));
        const env = query.get("env");
        if (env) {
          const [idWithoutQuery] = id.split("?");
          const ast = oxc.parseSync(idWithoutQuery, code, {
            astType: "ts",
            preserveParens: true,
          });

          for (const node of ast.program.body) {
            if (node.type === "ImportDeclaration") {
              const [ogSource, ...ogQueryRest] = node.source.value.split("?");
              const query = new URLSearchParams(ogQueryRest.join("?"));
              if (!query.has("env")) {
                query.set("env", env);
                node.source.value = `${ogSource}?${query.toString()}`;
                node.source.raw = JSON.stringify(node.source.value);
              }
            }
          }

          return esrap.print(ast.program, isJSXFile(id) ? tsx() : ts());
        }
      },
      renderChunk(code, chunk) {
        const matches = Array.from(
          code.matchAll(/['"]__IMPORT_ENV__[\w\d]+['"]/g)
        ).reverse();

        for (const match of matches) {
          // Replace the import with public_path/<id>.js
          const id = match[0].slice(1, -1);

          const replacement = entryAssets[id];
          if (replacement) {
            missingAssets.delete(id);
          } else {
            missingAssets.add(id);
          }

          const getRelativeServerImport = () => {
            if (!replacement) return "environment asset not found";
            const outPath = path.resolve(
              this.environment.config.root,
              replacement.outDir,
              replacement.file
            );
            const chunkPath = path.resolve(
              this.environment.config.root,
              this.environment.config.build.outDir,
              chunk.fileName
            );
            let relativePath = vite.normalizePath(
              path.relative(path.dirname(chunkPath), outPath)
            );
            if (!relativePath.startsWith(".")) {
              relativePath = "./" + relativePath;
            }

            return relativePath;
          };

          code =
            code.slice(0, match.index + 1) +
            (this.environment.config.consumer === "server"
              ? getRelativeServerImport()
              : replacement
                ? replacement.base + replacement.file
                : "environment asset not found") +
            code.slice(match.index + match[0].length - 1);
        }

        return code;
      },
      writeBundle(_, bundle) {
        updateEntries();
        if (this.environment.config.build.manifest) {
          const asset =
            bundle[
              typeof this.environment.config.build.manifest === "string"
                ? this.environment.config.build.manifest
                : ".vite/manifest.json"
            ];
          if (asset?.type === "asset" && typeof asset.source === "string") {
            const manifest = JSON.parse(asset.source) as vite.Manifest;
            for (const chunk of Object.values(manifest)) {
              if (chunk.isEntry && chunk.name?.startsWith("__IMPORT_ENV__")) {
                entryAssets[chunk.name] = {
                  base: this.environment.config.base,
                  file: chunk.file,
                  outDir: this.environment.config.build.outDir,
                };
              }
            }
          }
        }
      },
    },
    {
      name: "import-env-server",
      enforce: "pre",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url || "/", `http://${req.headers.host}`);
          const env = url.searchParams.get("env");
          const environment = env ? server.environments[env] : null;
          if (environment) {
            const cleanURL = new URL(url);
            cleanURL.searchParams.delete("env");
            let mod = await environment.transformRequest(
              url.pathname + url.search
            );
            if (!mod || !mod.code) {
              mod = await environment.transformRequest(
                cleanURL.pathname + cleanURL.search
              );
            }
            if (mod) {
              res.setHeader("Cache-Control", "no-cache");
              if (mod.etag) res.setHeader("Etag", mod.etag);
              res.setHeader("Content-Type", "application/javascript");
              res.end(mod.code);
              return;
            }
          }

          next();
        });
      },
    },
  ];
}

export default importEnv;
