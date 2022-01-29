// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExposedFunctions = Record<string, (...args: any[]) => any>;

/** Message sent to worker */
type request = {
  id: number;
  action: string; // Name of function to call
  payload: unknown[]; // Arguments to pass to function
};

/** Message received from worker */
type response = {
  id: number;
  type: 'success' | 'error';
  payload: unknown;
};

/** The wrapper used to interface with the worker.
 *  It has an async function corresponding to each exposed function,
 *  and a `terminate` function to kill the worker */
type WorkerWrapper<T extends ExposedFunctions> = {
  // Make all functions in T return promises
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Result
    ? (
        ...args: Args
      ) => Result extends Promise<unknown> ? Result : Promise<Result>
    : never;
} & { terminate: () => void };

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

/** Takes in an exposed worker, returns the WorkerWrapper used to interface with it */
async function wrap<T extends ExposedFunctions>(
  worker: Worker
): Promise<WorkerWrapper<T>> {
  type job = {
    request: request;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  };

  let jobId = 0;
  const activeJobs: job[] = [];

  /** Creates and runs a new job, returns a promise for its result */
  const createJob = function (temp: Pick<request, 'action' | 'payload'>) {
    const request = { ...temp, id: jobId++ };
    const job = new Promise((resolve, reject) => {
      activeJobs.push({ request, resolve, reject });
    });
    worker.postMessage(request);

    return job;
  };

  worker.onmessage = function (message: MessageEvent<response>) {
    const response = message.data;

    const jobIndex = activeJobs.findIndex(
      (job) => job.request.id == response.id
    );

    if (jobIndex < 0) {
      console.error('Worker responded to nonexistent job');
      console.warn("Worker's response:", response);
      return;
    } else {
      const job = activeJobs.splice(jobIndex, 1)[0];
      response.type == 'success'
        ? job.resolve(response.payload)
        : job.reject(response.payload);
    }
  };

  worker.onerror = function (error) {
    // We don't actually know what job the error occured in, so reject them all just to be safe.
    // This event should never fire since we have a try catch within the worker's onmessage
    console.error('Uncaught error in worker:', error);

    const jobs = activeJobs.splice(0, activeJobs.length);
    jobs.forEach((job) => job.reject(error));
  };

  /// Create the wrapper
  const wrapper = {} as ExposedFunctions;

  // Obtain list of functions available in the worker
  const functionality = (await createJob({
    action: '_getFunctionality',
    payload: [],
  })) as string[];

  // Create proxy functions for these
  functionality.forEach(
    (fname) =>
      (wrapper[fname] = (...args: unknown[]) =>
        createJob({ action: fname, payload: args }))
  );

  // Add the termination function
  wrapper.terminate = () => worker.terminate();

  return wrapper as WorkerWrapper<T>;
}

export { expose, wrap };
export type { WorkerWrapper };
