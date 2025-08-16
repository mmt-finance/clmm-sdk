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
    const poolId = [
      '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388',
      '0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9',
    ];
    const coinXType = [
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
      '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
    ];
    const coinYType = [
      '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    ];

    const result = await poolModule.getMinTickRangeFactor(poolId, coinXType, coinYType);
    expect(result[0].minTickRangeFactor).toBeGreaterThan(0);
    expect(result[0].poolId).toEqual(poolId[0]);
  }, 100000);
});
