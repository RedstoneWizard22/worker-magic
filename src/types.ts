// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

type ExposedFunctions = Record<string, AnyFunction>;

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

/** The wrapper used to interface with the worker */
type WorkerWrapper<T extends ExposedFunctions> = {
  // Create an async copy of each exposed function
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Result
    ? (
        ...args: Args
      ) => Result extends Promise<unknown> ? Result : Promise<Result> // Ensure promise is returned
    : never;
} & { terminate: () => void };

export type { ExposedFunctions, AnyFunction, WorkerWrapper, request, response };
