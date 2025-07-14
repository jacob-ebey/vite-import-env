import { defineConfig } from "vite";
import { importEnv } from "vite-import-env";

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
        include: ["client-only"],
      },
    },
    server: {
      consumer: "client",
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
      },
      optimizeDeps: {
        include: ["server-only"],
      },
    },
  },
  plugins: [importEnv()],
});
