import {
  ESModulesEvaluator,
  ModuleRunner,
  type ModuleRunnerTransport,
} from "vite/module-runner";

declare const ___OPTIONS___: any;
declare const ___ENTRYPOINT___: string;

function fetchClientFetchModule(
  baseURL: string,
  environmentName: string
): ModuleRunnerTransport["invoke"] {
  return async (payload) => {
    const data = JSON.stringify([environmentName, payload]);
    const response = await fetch(
      new URL("/@vite/invoke?" + new URLSearchParams({ data }), baseURL)
    );
    const result = response.json();
    return result as any;
  };
}

function createFetchRunner(options: {
  root: string;
  environmentName: string;
  baseURL: string;
}) {
  const runner = new ModuleRunner(
    {
      sourcemapInterceptor: false,
      transport: {
        invoke: fetchClientFetchModule(
          options.baseURL,
          options.environmentName
        ),
      },
      hmr: false,
    },
    new ESModulesEvaluator()
  );
  return runner;
}

const runner = createFetchRunner(___OPTIONS___);
runner.import(___ENTRYPOINT___);
