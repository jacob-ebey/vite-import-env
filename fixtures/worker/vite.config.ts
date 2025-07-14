import { defineConfig } from "vite";
import { importEnv } from "vite-import-env";

const importEnvPlugin = importEnv();

export default defineConfig({
  builder: {
    async buildApp(builder) {
      await builder.build(builder.environments.client);
    },
    sharedConfigBuild: true,
    sharedPlugins: true,
  },
  environments: {
    client: {
      build: {
        minify: false,
      },
      optimizeDeps: {
        include: ["client-only"],
      },
    },
    server: {
      consumer: "client",
      resolve: {
        conditions: ["react-server"],
      },
      optimizeDeps: {
        include: ["server-only"],
      },
    },
  },
  worker: {
    format: "es",
    plugins: () => [importEnvPlugin],
  },
  plugins: [importEnvPlugin],
});
