import { expose } from '../../dist/index.js';

/** Adds two numbers, but has a 33% chance of throwing an error */
function throw33(a: number, b: number) {
  if (Math.random() < 0.33) {
    throw new Error('I failed');
  }
  return a + b;
}

/** Throws an error with a custom message */
function throwError(message: string) {
  throw new Error(message);
}

/** a + b */
function add(a: number, b: number) {
  return a + b;
}

/** a * b */
function multiply(a: number, b: number) {
  return a * b;
}

/** a - b */
function subtract(a: number, b: number) {
  return a - b;
}

const functionality = {
  add,
  multiply,
  subtract,
  throwError,
  throw33,
};

expose(functionality);

export type Functionality = typeof functionality;
