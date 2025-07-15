import { createRequestListener } from "@mjackson/node-fetch-server";
import { defineConfig, RunnableDevEnvironment } from "vite";
import { importEnv } from "vite-import-env";

export default defineConfig({
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.ssr);
      await builder.build(builder.environments.server);
    },
    sharedConfigBuild: true,
    sharedPlugins: true,
  },
  environments: {
    ssr: {
      consumer: "server",
      build: {
        emptyOutDir: true,
        outDir: "dist",
        rollupOptions: {
          input: "./src/entry.ssr.ts",
        },
      },
      resolve: {
        noExternal: true,
      },
      optimizeDeps: {
        include: ["client-only"],
      },
    },
    server: {
      consumer: "server",
      build: {
        manifest: ".vite/server.manifest.json",
        emptyOutDir: false,
        outDir: "dist",
        rollupOptions: {
          preserveEntrySignatures: "exports-only",
        },
      },
      resolve: {
        conditions: ["react-server"],
        noExternal: true,
      },
      optimizeDeps: {
        include: ["server-only"],
      },
    },
  },
  plugins: [
    importEnv(),
    {
      name: "dev-server",
      configureServer(server) {
        return () => {
          server.middlewares.use(
            createRequestListener(async (request) => {
              const ssr = server.environments.ssr as RunnableDevEnvironment;

              const mod = (await ssr.runner.import(
                "./src/entry.ssr.ts"
              )) as typeof import("./src/entry.ssr");

              return mod.default.fetch(request);
            })
          );
        };
      },
    },
  ],
});
