import { MmtSDK, PoolModule } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { ExtendedPoolWithApr } from '../src/types';
import { Transaction } from '@mysten/sui/transactions';

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

  it('should throw error when tick range is too small', async () => {
    const poolId = '0xd970616a91e67a2aea8347bc6444ee6cab11657718ff0c4b833d4f5de12efad0';
    const tokenXType =
      '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI';
    const tokenYType =
      '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
    const minTickRangeFactor = 5;
    const tickSpacing = 2;
    const lowerSqrtPrice = '19006601896370029129';
    const upperSqrtPrice = '19014205677600719231';
    const tx = new Transaction();

    expect(() => {
      sdk.Position.openPosition(
        tx,
        {
          objectId: poolId, // Pool ID where liquidity is added
          tokenXType: tokenXType, // Token X type
          tokenYType: tokenYType, // Token Y type
          tickSpacing: tickSpacing, // Pool tick spacing
          minTickRangeFactor: minTickRangeFactor, // min tick range factor
        },
        lowerSqrtPrice, // Lower price bound
        upperSqrtPrice, // Upper price bound
      );
    }).toThrow('Tick range (8) is too small. Minimum required: 10');
  });
});
