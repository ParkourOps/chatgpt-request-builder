import { encode, decode } from '../tokenizer';
import { expect } from 'chai';

describe('tokenizer functions', function () {
  it('encodes and decodes a given string', function () {
    const testString = `'A Test Project'`;
    const n = encode(testString);
    const m = decode(n);
    console.debug('tokenizer encoded: ', n);
    console.debug('tokenizer decoded: ', m);
    expect(m).to.equal(testString);
  });
});
