import "server-only";

// @ts-expect-error - polyfill webpack global
globalThis.__webpack_require__ = () => {};

export async function fetchServer(request: Request) {
  const { renderToReadableStream } = await import(
    // @ts-expect-error - no types for this package
    "react-server-dom-webpack/server.browser"
  );
  return new Response(
    renderToReadableStream(
      <h1 data-testid="server-title">Hello from the server!</h1>
    )
  );
}
