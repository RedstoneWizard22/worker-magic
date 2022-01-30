import type {
  WorkerWrapper,
  ExposedFunctions,
  request,
  response,
} from './types.js';

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

export { wrap };
