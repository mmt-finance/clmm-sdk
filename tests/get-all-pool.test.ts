import { PoolModule } from '../src/modules/poolModule';
import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import Decimal from 'decimal.js';
import { DecimalUtils } from './decimal-utils';

describe('PoolModule', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'testnet',
    });
    poolModule = sdk.Pool;
  });

  it('getAllPools', async () => {
    const pools = await sdk.Pool.getAllPools();

    pools.forEach((pool) => {
      expect(pool.aprBreakdown).toBeDefined();

      // The apr equal may differ in backend latency. Skip check for now.
      // const aprDB = new Decimal(pool.apy);
      // const feeApr = new Decimal(pool.aprBreakdown.fee);
      // const gotApr = pool.aprBreakdown.rewards.reduce((res, reward) => {
      //   return res.add(reward.apr);
      // }, feeApr);
      //
      // expect(DecimalUtils.toBeCloseToDecimal(gotApr, aprDB));
    });
  });

  describe('validatePoolsId', () => {
    it('positive', async () => {
      const poolIds = ['0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7'];
      await (poolModule as any).validatePoolsId(poolIds);
    });

    it('negative', async () => {
      const poolIds = ['0xda49f058120f6cca99fb492701275350a85170a152569e400f641609407f453e'];
      await expect((poolModule as any).validatePoolsId(poolIds)).rejects.toThrowError(
        'Invalid pool type',
      );
    });
  });
});
