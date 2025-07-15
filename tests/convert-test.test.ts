import { describe } from '@jest/globals';
import { convertI128ToSigned, convertSignedToI128 } from '../src/utils/math/tickMath';

describe('i128 test', () => {
  it('test i128 convert to signed positive number', async () => {
    expect(convertI128ToSigned('340282366920938463463374607431768211356')).toEqual(BigInt('-100'));
  });

  it('test i128 convert to signed negative number', async () => {
    expect(convertI128ToSigned('100')).toEqual(BigInt('100'));
  });

  it('test signed convert to i128 positive number', async () => {
    expect(convertSignedToI128('-100')).toEqual(BigInt('340282366920938463463374607431768211356'));
  });

  it('test signed convert to i128 negative number', async () => {
    expect(convertSignedToI128('100')).toEqual(BigInt('100'));
  });
});
