import { MmtSDK, PoolModule } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { ExtendedPoolWithApr } from '../src/types';

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
    const pools = await poolModule.getAllPools();
    const poolIds = pools.map((pool) => pool.poolId);
    const tokenXTypes = pools.map((pool) => pool.tokenXType);
    const tokenYTypes = pools.map((pool) => pool.tokenYType);

    const result = await poolModule.getMinTickRangeFactor(poolIds, tokenXTypes, tokenYTypes);
    expect(result[0].minTickRangeFactor).toBeGreaterThan(0);
    expect(result[0].poolId).toEqual(poolIds[0]);
  }, 100000);
});
