# vite-import-env

A Vite plugin that enables cross-environment imports using import attributes syntax. This plugin allows you to import modules from different Vite environments (client, server, worker, etc.) within the same codebase using the `with { env: "..." }` syntax.

An updated version of https://github.com/alex8088/electron-vite/blob/master/src/plugins/worker.ts with support for `dev`, not just `build`.

## Installation

```bash
npm install vite-import-env
# or
pnpm add vite-import-env
# or
yarn add vite-import-env
```

## Setup

Add the plugin to your Vite configuration:

```typescript
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
      // Client environment configuration
    },
    server: {
      // Server environment configuration
      build: {
        rollupOptions: {
          // Required for environments that are imported in other environments
          preserveEntrySignatures: "exports-only",
        },
      },
      resolve: {
        conditions: ["react-server"],
      },
    },
    // Add more environments as needed
  },
  plugins: [importEnv()],
});
```

## Usage

### Basic Cross-Environment Imports

Use the `with { env: "..." }` syntax to import modules from different environments:

```typescript
// Import server-side code from client environment
import { server } from "./entry.server" with { env: "server" };

// Import client-side code from server environment
import { clientOnlyValue } from "./client-only" with { env: "client" };
```

### Example: Client Entry Point

```typescript
// entry.client.ts
import "client-only";

import { clientOnlyValue } from "./client-only";
import { sharedValue } from "./shared";

// Import server-side function from server environment
import { server } from "./entry.server" with { env: "server" };

export const client = () => ({
  clientOnlyValue,
  server,
  sharedValue,
  value: "client-value",
});
```

### Example: Server Entry Point

```typescript
// entry.server.ts
import "server-only";

// Import client-side value from client environment
import { clientOnlyValue } from "./client-only" with { env: "client" };
import { serverOnlyValue } from "./server-only";
import { sharedValue } from "./shared";

export const server = {
  clientOnlyValue,
  serverOnlyValue,
  sharedValue,
  value: "server-value",
};
```

### Worker Example

The plugin also works with Web Workers:

```typescript
// entry.worker.ts
import "client-only";

import { clientOnlyValue } from "./client-only";
import { sharedValue } from "./shared";

// Import server code from worker environment
import { server } from "./entry.server" with { env: "server" };

const client = () => ({
  clientOnlyValue,
  server,
  sharedValue,
  value: "client-value",
});

postMessage(client());
```

## How It Works

The plugin transforms import statements with environment attributes in two phases:

1. **Transform Phase**: Converts `with { env: "..." }` syntax to query parameters

   ```typescript
   // Before
   import { server } from "./entry.server" with { env: "server" };

   // After
   import { server } from "./entry.server?env=server";
   ```

2. **Resolution Phase**: Uses the appropriate environment's resolver to handle the import based on the `env` query parameter

## Environment Propagation

When a module is imported with an environment attribute, all of its internal imports automatically inherit that environment context. This ensures that the entire dependency tree is resolved within the correct environment.

## License

ISC
