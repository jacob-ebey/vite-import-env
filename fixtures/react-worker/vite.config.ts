import { defineConfig } from "vite";
import { importEnv } from "vite-import-env";

const importEnvPlugin = importEnv();

export default defineConfig({
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.client);
      await builder.build(builder.environments.server);
    },
    sharedConfigBuild: true,
    sharedPlugins: true,
  },
  environments: {
    client: {
      build: {
        emptyOutDir: true,
        outDir: "dist",
        rollupOptions: {
          input: "index.html",
        },
      },
      optimizeDeps: {
        include: [
          "client-only",
          "react",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "react-dom",
          "react-server-dom-webpack/client.browser",
        ],
      },
    },
    server: {
      consumer: "client",
      build: {
        manifest: ".vite/server.manifest.json",
        minify: false,
        emptyOutDir: false,
        outDir: "dist",
        rollupOptions: {
          preserveEntrySignatures: "exports-only",
        },
      },
      resolve: {
        conditions: ["react-server"],
      },
      optimizeDeps: {
        include: [
          "server-only",
          "react",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "react-dom",
          "react-server-dom-webpack/server.browser",
        ],
      },
    },
  },
  worker: {
    format: "es",
    plugins: () => [importEnvPlugin],
  },
  plugins: [importEnvPlugin],
});
