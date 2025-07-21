import { createInterface } from 'node:readline';

export function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}
