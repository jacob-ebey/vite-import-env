import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: "fixtures/**/*.test.ts",
  projects: [
    {
      name: "Chrome",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
