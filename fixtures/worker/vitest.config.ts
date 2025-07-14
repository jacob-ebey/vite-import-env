import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default defineConfig({
  ...viteConfig,
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: "playwright",
      instances: [{ name: "worker", browser: "chromium" }],
    },
  },
});
