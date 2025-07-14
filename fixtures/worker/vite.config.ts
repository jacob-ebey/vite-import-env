import { defineConfig } from "vite";
import { importEnv } from "vite-import-env";

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
  plugins: [importEnv()],
});
