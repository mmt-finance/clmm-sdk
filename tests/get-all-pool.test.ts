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

  describe('getAllPools', () => {
    it('normal', async () => {
      const pools = await sdk.Pool.getAllPools();

      // pools.forEach((pool) => {
      //   expect(pool.aprBreakdown).toBeDefined();
      //
      //   const aprDB = new Decimal(pool.apy);
      //   const feeApr = new Decimal(pool.aprBreakdown.fee);
      //   const gotApr = pool.aprBreakdown.rewards.reduce((res, reward) => {
      //     return res.add(reward.apr);
      //   }, feeApr);
      //
      //   expect(DecimalUtils.toBeCloseToDecimal(gotApr, aprDB));
      //   expect(DecimalUtils.toBeCloseToDecimal(gotApr, new Decimal(pool.aprBreakdown.total)));
      // });
    }, 30000);

    it('getAllPools no validate', async () => {
      (sdk.Pool as any).validatePoolsId = jest.fn().mockRejectedValueOnce(new Error('test error'));
      await sdk.Pool.getAllPools(undefined, false);
      jest.clearAllMocks();
    });

    it('getAllPools validate fails', async () => {
      (sdk.Pool as any).validatePoolsId = jest.fn().mockRejectedValueOnce(new Error('test error'));
      await expect(async () => {
        await sdk.Pool.getAllPools();
      }).rejects.toThrow();
      jest.clearAllMocks();
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

  describe('getPool', () => {
    it('skip validation', async () => {
      (sdk.Pool as any).validatePoolsId = jest.fn().mockRejectedValueOnce(new Error('test error'));
      await sdk.Pool.getPool(
        '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7',
        undefined,
        false,
      );
      jest.clearAllMocks();
    });

    it('validation error', async () => {
      (sdk.Pool as any).validatePoolsId = jest.fn().mockRejectedValueOnce(new Error('test error'));
      await expect(async () => {
        await sdk.Pool.getPool(
          '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7',
          undefined,
          true,
        );
      }).rejects.toThrow();
      jest.clearAllMocks();
    });
  });
});
