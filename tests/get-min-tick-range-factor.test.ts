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

  it('getMinTickRangeFactor negative bigger than 1024', async () => {
    const pools = await poolModule.getAllPools();
    const poolsCopy = [
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
      ...pools,
    ] as ExtendedPoolWithApr[];
    const poolIds = poolsCopy.map((pool) => pool.poolId);
    const tokenXTypes = poolsCopy.map((pool) => pool.tokenXType);
    const tokenYTypes = poolsCopy.map((pool) => pool.tokenYType);

    await expect(
      poolModule.getMinTickRangeFactor(poolIds, tokenXTypes, tokenYTypes),
    ).rejects.toThrow(
      'Invalid input: poolIds must not be empty and must less than 1024 and coinXTypes must match coinYTypes',
    );
  }, 100000);

  it('getMinTickRangeFactor negative pools equal to 0', async () => {
    const pools = [];
    const poolIds = pools.map((pool) => pool.poolId);
    const tokenXTypes = pools.map((pool) => pool.tokenXType);
    const tokenYTypes = pools.map((pool) => pool.tokenYType);

    await expect(
      poolModule.getMinTickRangeFactor(poolIds, tokenXTypes, tokenYTypes),
    ).rejects.toThrow(
      'Invalid input: poolIds must not be empty and must less than 1024 and coinXTypes must match coinYTypes',
    );
  }, 100000);

  it('getMinTickRangeFactor negative coinXTypes not match coinYTypes', async () => {
    const pools = await poolModule.getAllPools();
    const poolIds = pools.map((pool) => pool.poolId);
    const tokenXTypes = pools.map((pool) => pool.tokenXType);
    const tokenYTypes = pools.map((pool) => pool.tokenYType);
    tokenXTypes.push(tokenXTypes[0]);

    await expect(
      poolModule.getMinTickRangeFactor(poolIds, tokenXTypes, tokenYTypes),
    ).rejects.toThrow(
      'Invalid input: poolIds must not be empty and must less than 1024 and coinXTypes must match coinYTypes',
    );
  }, 100000);
});
