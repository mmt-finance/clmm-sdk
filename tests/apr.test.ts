import { MmtSDK, PoolModule, TickMath } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';
import ALL_TOKEN_DATA from './__test_data__/all-tokens.json';
import { convertI32ToSigned } from '../src/utils/math/tickMath';
import BN from 'bn.js';
import { getCoinAmountFromLiquidity } from '../src/utils/poolUtils';
import Decimal from 'decimal.js';

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
    // expect(pool.aprBreakdown.fee).toEqual('16.080169483414516253');
  });

  it('test unStable apr', async () => {
    const poolId = '0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    // expect(pool.aprBreakdown.fee).toEqual('804.51669792413246471');
  });

  it('position apr should be defined', async () => {
    const userPositions = await sdk.Position.getAllUserPositions(
      '0x396c8d5f9560f2ffa5d67dcdf3f458ee654ad3e3e08d4eb6ff50e7ddf66a82e5',
    );
    for (const position of userPositions) {
      const pool = await sdk.Pool.getPool(position.poolId, undefined, false);
      const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.lowerTick);
      const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.upperTick);
      const tokenXDecimals = pool.tokenX.decimals;
      const tokenYDecimals = pool.tokenY.decimals;
      const pool_lower_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacing(
          new Decimal(position.lowerPrice),
          tokenXDecimals,
          tokenYDecimals,
          pool.tickSpacing,
        ),
      );
      const pool_upper_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacing(
          new Decimal(position.upperPrice),
          tokenXDecimals,
          tokenYDecimals,
          pool.tickSpacing,
        ),
      );
      const liquidityAmounts = getCoinAmountFromLiquidity(
        new BN(position.liquidity),
        new BN(pool.currentSqrtPrice!),
        lowerSqrtPrice,
        upperSqrtPrice,
        true,
      );
      const aprData = await sdk.Pool.estPositionAPRWithDeltaMethod(
        convertI32ToSigned(Number(pool.currentTickIndex)),
        pool_lower_tick_index,
        pool_upper_tick_index,
        new BN(pool.currentSqrtPrice),
        new BN(pool.liquidity),
        tokenXDecimals,
        tokenYDecimals,
        Number(pool?.lpFeesPercent),
        (Number(liquidityAmounts.coinA) / 10 ** tokenXDecimals).toString(),
        (Number(liquidityAmounts.coinB) / 10 ** tokenYDecimals).toString(),
        pool.volume24h,
        pool.tokenX.price.toString(),
        pool.tokenY.price.toString(),
        pool.rewarders,
      );
      expect(aprData.feeAPR).toBeDefined();
    }
  });
});
