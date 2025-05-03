import { MmtSDK, PoolModule } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';

describe('PoolModule.fetchAllTickLiquidities & fetchTickLiquiditity', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;
  });

  it('fetchAllTickLiquidities positive', async () => {
    const poolId = '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388';
    const tickLiquidities = await poolModule.fetchAllTickLiquidities(poolId);
    const reverseTickLiquidities = await poolModule.fetchAllTickLiquidities(poolId, true);
    if (tickLiquidities && tickLiquidities.length > 0) {
      for (let i = 0; i < tickLiquidities.length; i++) {
        expect(tickLiquidities[i].tickIndex).toEqual(-reverseTickLiquidities[i].tickIndex);
      }
    }
  }, 30000);

  it('fetchTickLiquiditity positive', async () => {
    const poolId = '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388';
    const resp = await poolModule.fetchTickLiquiditity(poolId, 1, 1);
    const reverseResp = await poolModule.fetchTickLiquiditity(poolId, 1, 1, true);
    const tickData = resp.data?.tickData || [];
    const reverseTickData = reverseResp.data?.tickData || [];
    if (resp && tickData.length > 0) {
      for (let i = 0; i < tickData.length; i++) {
        expect(tickData[i].tickIndex).toEqual(-reverseTickData[i].tickIndex);
      }
    }
  });
});
