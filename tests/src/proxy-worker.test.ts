import { wrap } from '../../dist/index.js';
import type { Functionality } from './worker.js';
import type { WorkerWrapper } from '../../dist/index.js';

const expect = chai.expect;
let proxy: WorkerWrapper<Functionality>;

describe('worker unit tests', async () => {
  before(async () => {
    const worker = new Worker('./build/worker.js', { type: 'module' });
    proxy = await wrap<Functionality>(worker);
  });

  after(() => {
    proxy.terminate();
  });

  it('All exposed functions have proxies', () => {
    expect(proxy.add).to.be.a('function');
    expect(proxy.multiply).to.be.a('function');
    expect(proxy.subtract).to.be.a('function');
    expect(proxy.throwError).to.be.a('function');
    expect(proxy.throw33).to.be.a('function');
  });
  it('Terminate proxy exists', () => {
    expect(proxy.terminate).to.be.a('function');
  });
  it('Non-throwing functions run as expected', async () => {
    const expectedResults: number[] = [];
    const promisedResults: Promise<number>[] = [];

    for (let i = 0; i < 1000; i++) {
      const a = Math.floor(Math.random() * 100);
      const b = Math.floor(Math.random() * 100);
      expectedResults.push(a + b);
      promisedResults.push(proxy.add(a, b));
      expectedResults.push(a - b);
      promisedResults.push(proxy.subtract(a, b));
      expectedResults.push(a * b);
      promisedResults.push(proxy.multiply(a, b));
    }

    const actualResults = await Promise.all(promisedResults);

    expect(actualResults).to.deep.equal(expectedResults);
  });
  it('Throw33 function returns errors 33% of the time', async () => {
    let successes = 0;
    let failures = 0;

    for (let i = 0; i < 1000; i++) {
      const a = Math.floor(Math.random() * 100);
      const b = Math.floor(Math.random() * 100);

      try {
        const sum = await proxy.throw33(a, b);
        expect(sum).to.equal(a + b);
        successes++;
      } catch (error) {
        console.log(error);
        failures++;
      }
    }

    const failiureRatio = failures / (successes + failures);
    expect(failiureRatio).to.be.closeTo(0.33, 0.05);
  });
});
