import { beforeEach, describe, test } from '@jest/globals';
import { MmtSDK, PoolModule } from '../src';

describe('PoolModule.swap', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });

    poolModule = sdk.Pool;
  });

  test('', async () => {
    const allPools = await poolModule.getAllPools();
  }, 30000);
});
