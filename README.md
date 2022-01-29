# worker-magic

> Make web workers fun!

worker-magic is a small library aimed at making web workers as easy to use as possible. It allows you to call worker functions directly via a wrapper, returning promises of the results. No more struggling with mesages and event handlers!

- Full typescript support (but you can use vanilla js too :))
- Bundler independent
- Perfect with async/await
- Tiny size

Upcoming features:

- Subscribable functions ❌
- Worker pooling ❌
- Documentation site ❌

## Usage

Using this library is simple, all you need is two functions!

1. Use `expose()` at the end of your worker to make functions callable from the master thread. This takes in an object whose entries are functions, which can be async.

2. Load the worker in your script however you like, e.g. worker-loader

3. Create a new instance of the worker and pass it into `wrap()` to create the wrapper object

4. You can now call worker functions "directly" using the wrapper! E.g. `const result = await wrapper.someFunction()`. They will all return promises which resolve with the result or reject with an error if one occurs. You can also use `wrapper.terminate()` to terminate the worker

See the example below:

**worker.ts**

```typescript
import { expose } from 'worker-magic';

function add(a: number, b: number) {
  return a + b;
}

function multiply(a: number, b: number) {
  return a * b;
}

expose({ add, multiply });

// Export the type for type checking
const workerFunctions = { add, multiply };
type WorkerFunctions = typeof workerFunctions;
export type { WorkerFunctions };
```

**index.ts**

```typescript
import { wrap } from 'worker-magic';
// You may load the worker as you like, I use worker-loader as it requires no configuration
import DemoWorker from 'worker-loader!./worker';

import type { WorkerFunctions } from './worker';

async function run() {
  // Create the worker & wrapper
  const wrapper = await wrap<WorkerFunctions>(new DemoWorker());

  // Use the worker
  const a = 2,
    b = 5;

  const added = await wrapper.add(2, 5);
  const multiplied = await wrapper.multiply(2, 5);

  console.log(`${a} + ${b} = ${added}`);
  console.log(`${a} * ${b} = ${multiplied}`);

  // Terminate the worker
  wrapper.terminate();
}

void run();
```

If you need the wrapper type you can import it too:

```typescript
import type { WorkerWrapper } from 'worker-magic';
import type { WorkerFunctions } from './worker';

let wrapper: WorkerWrapper<WorkerFunctions>;
```
