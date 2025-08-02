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

  it.skip('getMinTickRangeFactor positive', async () => {
    const poolId = '0x9955e9472d0d4940004271d7ed8ab034cd895071b59d43f0decb1dcc1404dcfd';
    const coinXType =
      '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD';
    const coinYType =
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC';

    const minTickRangeFactor = await poolModule.getMinTickRangeFactor(poolId, coinXType, coinYType);
    expect(minTickRangeFactor).toBeGreaterThan(0);
  }, 100000);
});
