import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
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
    cloudflare({
      viteEnvironment: { name: "ssr" },
    }),
  ],
});
