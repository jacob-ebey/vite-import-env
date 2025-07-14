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

export function fetchWorker(
  worker: Worker,
  request: Request
): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    let controller!:
      | ReadableStreamDefaultController<Uint8Array<ArrayBufferLike>>
      | undefined;

    const rejectResponse = (error: unknown) => {
      worker.removeEventListener("message", onMessage);
      if (!controller) {
        reject(error);
        return;
      }
      controller.error(error);
    };

    worker.addEventListener("error", (event) => rejectResponse(event), {
      once: true,
    });
    worker.addEventListener("message", onMessage);

    const id = crypto.randomUUID();

    const transfer: Transferable[] = [];
    if (request.body) {
      transfer.push(request.body);
    }

    worker.postMessage(
      {
        type: "fetch",
        id,
        body: request.body,
        headers: Array.from(request.headers),
        method: request.method,
        url: request.url,
      } satisfies FetchEvent,
      {
        transfer,
      }
    );

    function onMessage(
      event: MessageEvent<
        ResponseEvent | ResponseErrorEvent | ResponseBodyEvent
      >
    ) {
      const data = event.data;

      switch (data?.type) {
        case "response":
          if (data.id === id) {
            if (data.done) {
              worker.removeEventListener("message", onMessage);
            }
            resolve(
              new Response(
                data.done
                  ? null
                  : new ReadableStream({
                      start(ctrl) {
                        controller = ctrl;
                      },
                    }),
                {
                  headers: new Headers(data.headers),
                  status: data.status,
                  statusText: data.statusText,
                }
              )
            );

            if (data.done && controller) {
              controller.close();
            }
          }
          break;
        case "response-error":
          if (data.id === id) {
            worker.removeEventListener("message", onMessage);
            const error = new Error(data.message);
            error.stack = data.stack;
            rejectResponse(error);
          }
          break;
        case "response-body":
          if (data.id === id) {
            if (!controller) {
              worker.removeEventListener("message", onMessage);
              rejectResponse(
                new Error("Response body received before response")
              );
              return;
            }
            if (data.body) {
              controller.enqueue(data.body);
            }
            if (data.done) {
              worker.removeEventListener("message", onMessage);
              controller.close();
            }
          }
          break;
      }
    }
  });
}
