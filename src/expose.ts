import type { ExposedFunctions, request, response } from './types.js';

/** Expose a set of functions to be callable from the master thread (via a WorkerWrapper) */
function expose(functions: ExposedFunctions): void {
  // Ensure we are running in a worker
  if (typeof WorkerGlobalScope === 'undefined') {
    console.error('Expose not called in worker thread');
    return;
  }

  const onSuccess = function (request: request, result: unknown) {
    postMessage({
      id: request.id,
      type: 'success',
      payload: result,
    } as response);
  };

  const onError = function (request: request, error: unknown) {
    postMessage({
      id: request.id,
      type: 'error',
      payload: error,
    } as response);
  };

  /** Returns a list of all exposed function names */
  const _getFunctionality = function () {
    const functionality = Object.keys(functions).filter(
      (key) => typeof functions[key] === 'function'
    );
    return functionality;
  };

  /** Executes the function corresponding to a request and returns a promise of the result */
  const exec = function (request: request): Promise<unknown> {
    const func = functions[request.action];
    const args = request.payload;

    const result = func(...args) as unknown;

    if (result instanceof Promise) {
      return result;
    }

    return Promise.resolve(result);
  };

  onmessage = async function (message: MessageEvent<request>) {
    const request = message.data;
    // We must catch any errors so we can match them to a request
    try {
      let result: unknown;
      if (request.action === '_getFunctionality') {
        result = _getFunctionality();
      } else {
        result = await exec(request);
      }
      onSuccess(request, result);
    } catch (e) {
      onError(request, e);
    }
  };
}

export { expose };
