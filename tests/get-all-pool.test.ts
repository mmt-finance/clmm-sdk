import { PoolModule } from '../src/modules/poolModule';
import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';

describe('PoolModule', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'testnet',
    });
    poolModule = sdk.Pool;
  });

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
