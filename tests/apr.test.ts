import { MmtSDK, PoolModule, TickMath } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';
import ALL_TOKEN_DATA from './__test_data__/all-tokens.json';

describe('PoolModule.collectAllPoolsRewards', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;
  });

  it('test apr', async () => {
    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi')
      .mockResolvedValueOnce(ALL_POOL_DATA);

    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllTokenApi')
      .mockResolvedValueOnce(ALL_TOKEN_DATA);

    const poolId = '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    expect(pool.aprBreakdown.fee).toEqual('34.198687791337896869');
  });
});
