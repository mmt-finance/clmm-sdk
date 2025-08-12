import { MmtSDK, PoolModule } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';

describe('PoolModule.getMinTickRangeFactor', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;
  });

  it('getMinTickRangeFactor positive', async () => {
    const poolId = '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388';
    const coinXType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const coinYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

    const minTickRangeFactor = await poolModule.getMinTickRangeFactor(poolId, coinXType, coinYType);
    expect(minTickRangeFactor).toBeGreaterThan(0);
  }, 100000);
});
