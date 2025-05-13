import { MmtSDK, TickMath } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import Decimal from 'decimal.js';
import { convertI32ToSigned } from '../src/utils/math/tickMath';

describe('PoolModule', () => {
  let sdk: MmtSDK;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
  });
  describe('tick math test', () => {
    it('priceToTickIndexWithTickSpacing should return the correct result', async () => {
      const userPositions = await sdk.Position.getAllUserPositions(
        '0x6976e29249c8e03a54e6bc35ef3be1b3e5f1ef9dcc009635f6fef201a2ea6f8b',
      );

      for (const position of userPositions) {
        const chainUpperTick = convertI32ToSigned(position.upperTick);
        const chainLowerTick = convertI32ToSigned(position.lowerTick);
        const pool = await sdk.Pool.getPool(position.poolId, undefined, false);
        const pool_lower_tick_index = convertI32ToSigned(
          TickMath.priceToTickIndexWithTickSpacing(
            new Decimal(position.lowerPrice),
            pool.tokenX.decimals,
            pool.tokenY.decimals,
            pool.tickSpacing,
          ),
        );
        const pool_upper_tick_index = convertI32ToSigned(
          TickMath.priceToTickIndexWithTickSpacing(
            new Decimal(position.upperPrice),
            pool.tokenX.decimals,
            pool.tokenY.decimals,
            pool.tickSpacing,
          ),
        );
        expect(pool_lower_tick_index).toEqual(chainLowerTick);
        expect(pool_upper_tick_index).toEqual(chainUpperTick);
      }
    }, 300000);
  });
});
