import type { Transferable, Worker } from "node:worker_threads";

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
      worker.off("message", onMessage);
      if (!controller) {
        reject(error);
        return;
      }
      controller.error(error);
    };

    worker.once("error", (event) => rejectResponse(event));
    worker.on("message", onMessage);

    const id = crypto.randomUUID();

    const transfer: Transferable[] = [];
    if (request.body) {
      transfer.push(request.body as any);
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
      transfer
    );

    function onMessage(
      data: ResponseEvent | ResponseErrorEvent | ResponseBodyEvent
    ) {
      switch (data?.type) {
        case "response":
          if (data.id === id) {
            if (data.done) {
              worker.off("message", onMessage);
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
            worker.off("message", onMessage);
            const error = new Error(data.message);
            error.stack = data.stack;
            rejectResponse(error);
          }
          break;
        case "response-body":
          if (data.id === id) {
            if (!controller) {
              worker.off("message", onMessage);
              rejectResponse(
                new Error("Response body received before response")
              );
              return;
            }
            if (data.body) {
              controller.enqueue(data.body);
            }
            if (data.done) {
              worker.off("message", onMessage);
              controller.close();
            }
          }
          break;
      }
    }
  });
}
