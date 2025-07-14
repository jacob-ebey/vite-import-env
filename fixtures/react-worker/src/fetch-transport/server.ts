type FetchEvent = {
  type: "fetch";
  id: string;
  body: ReadableStream<Uint8Array<ArrayBufferLike>> | null;
  headers: [string, string][];
  method: string;
  url: string;
};

type ResponseEvent = {
  type: "response";
  id: string;
  headers: [string, string][];
  status: number;
  statusText: string;
  done: boolean;
};

type ResponseErrorEvent = {
  type: "response-error";
  id: string;
  message: string;
  stack?: string;
};

type ResponseBodyEvent = {
  type: "response-body";
  id: string;
  body?: Uint8Array<ArrayBufferLike>;
  done: boolean;
};

export function handleFetchEvent(
  handler: (request: Request) => Response | Promise<Response>
) {
  addEventListener("message", async (event: MessageEvent<FetchEvent>) => {
    const data = event.data;

    switch (data?.type) {
      case "fetch":
        try {
          const request = new Request(data.url, {
            // oxlint-disable-next-line no-invalid-fetch-options
            body: data.body,
            headers: new Headers(data.headers),
            method: data.method,
          });

          const response = await handler(request);

          postMessage({
            type: "response",
            id: data.id,
            headers: Array.from(response.headers),
            status: response.status,
            statusText: response.statusText,
            done: !response.body,
          } satisfies ResponseEvent);

          if (response.body) {
            const reader = response.body.getReader();

            while (true) {
              const { done, value } = await reader.read();

              const transfer: Transferable[] = [];
              if (value) {
                transfer.push(value.buffer);
              }

              postMessage(
                {
                  type: "response-body",
                  id: data.id,
                  body: value,
                  done,
                } satisfies ResponseBodyEvent,
                {
                  transfer,
                }
              );

              if (done) {
                break;
              }
            }
          }
        } catch (error) {
          postMessage({
            type: "response-error",
            id: data.id,
            message:
              typeof error === "object" && error instanceof Error
                ? error.message
                : String(error),
            stack:
              typeof error === "object" && error instanceof Error
                ? error.stack
                : undefined,
          } satisfies ResponseErrorEvent);
        }

        break;
    }
  });
}
