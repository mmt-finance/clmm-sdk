import { PoolModule } from '../src/modules/poolModule';
import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { ExtendedPool } from '../src/types';

describe('PoolModule', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;
  });
  describe('getAllPools', () => {
    it('normal', async () => {
      const pool = await poolModule.getPool(
        '0x60714d9ee9474a101b76f49801b2f86bd0e1cd76c4b96f5ded39893c62678ab5',
      );
      expect(pool).toBeDefined();

      const pools: ExtendedPool[] = await poolModule.getAllPools();
      expect(pools).toBeDefined();
    });
  });
});
