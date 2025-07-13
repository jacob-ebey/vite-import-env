import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/import-env.ts"],
  outDir: "dist",
  clean: true,
  format: "esm",
  dts: true,
  platform: "node",
  target: "node24",
});
