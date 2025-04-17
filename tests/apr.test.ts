import { MmtSDK, PoolModule } from '../src';
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

    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi')
      .mockResolvedValue(ALL_POOL_DATA);

    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllTokenApi')
      .mockResolvedValue(ALL_TOKEN_DATA);
  });

  it('test stable apr', async () => {
    const poolId = '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    expect(pool.aprBreakdown.fee).toEqual('0.16080169483414516253');
  });

  it('test unStable apr', async () => {
    const poolId = '0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    expect(pool.aprBreakdown.fee).toEqual('832.07670563227886445');
  });
});
