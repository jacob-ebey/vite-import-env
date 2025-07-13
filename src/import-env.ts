import * as esrap from "esrap";
import ts from "esrap/languages/ts";
import * as oxc from "oxc-parser";
import * as vite from "vite";

export default importEnv;

function isValidScriptFile(id: string): boolean {
  const [idWithoutQuery] = id.split("?");
  return (
    idWithoutQuery.endsWith(".ts") ||
    idWithoutQuery.endsWith(".tsx") ||
    idWithoutQuery.endsWith(".js") ||
    idWithoutQuery.endsWith(".jsx")
  );
}

export function importEnv(): vite.PluginOption[] {
  let resolvedConfig: vite.ResolvedConfig | undefined;

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

  return [
    {
      name: "with-to-query",
      enforce: "pre",
      transform(code, id) {
        if (!isValidScriptFile(id)) {
          return;
        }

        const ast = oxc.parseSync(id, code, {
          astType: "ts",
          preserveParens: true,
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

        const generated = esrap.print(ast.program, ts());
        return generated;
      },
    },
    {
      name: "import-env",
      enforce: "pre",
      configResolved(config) {
        resolvedConfig = config;
      },
      async resolveId(source, importer, { isEntry }) {
        if (isEntry || !importer) return;

        const [ogSource, ...ogQueryRest] = source.split("?");
        const query = new URLSearchParams(ogQueryRest.join("?"));
        const env = query.get("env");
        if (env) {
          const resolver = getResolver(env);
          const resolved = await resolver(ogSource, importer);
          if (resolved) {
            const [resolvedId, ...resolvedQueryRest] = resolved.split("?");
            const resolvedQuery = new URLSearchParams(
              resolvedQueryRest.join("?")
            );
            resolvedQuery.set("env", env);
            return `${resolvedId}?${resolvedQuery.toString()}`;
          }
        }
      },
      transform(code, id) {
        if (!isValidScriptFile(id)) {
          return;
        }

        const [_, ...ogQueryRest] = id.split("?");
        const query = new URLSearchParams(ogQueryRest.join("?"));
        const env = query.get("env");
        if (env) {
          const ast = oxc.parseSync(id, code, {
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

          return esrap.print(ast.program, ts());
        }
      },
    },
  ];
}
