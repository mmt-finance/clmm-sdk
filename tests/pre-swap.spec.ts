import { MmtSDK } from '../src';
import { describe, it, beforeEach } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';
import { Transaction } from '@mysten/sui/transactions';

describe('poolModule.preSwap', () => {
  let sdk: MmtSDK;
  let poolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;
    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi')
      .mockResolvedValueOnce(ALL_POOL_DATA);
  });

  it('positive SUI/USDC', async () => {
    const amount = BigInt(Math.floor(2 * 10 ** 9));
    const tx = new Transaction();
    const outAmount = await poolModule.preSwap(
      tx,
      [
        {
          poolId: '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388',
          tokenXType:
            '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
          tokenYType:
            '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
          isXtoY: true,
        },
        {
          poolId: '0x36694ea3d19d47cb23ee7998b77057492ab5b18ffe0223ae2700d02423227124',
          tokenXType:
            '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
          tokenYType:
            '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
          isXtoY: false,
        },
      ],
      amount,
    );
    expect(outAmount).toBeDefined();
  }, 30000);
});
