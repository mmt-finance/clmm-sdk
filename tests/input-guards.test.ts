import { Transaction } from '@mysten/sui/transactions';
import { MmtSDK } from '../src';
import { getPositionStatus } from '../src/utils/positionUtils';

describe('input guards', () => {
  const sdk = MmtSDK.NEW({ network: 'testnet' });
  const pool = {
    objectId: '0xpool',
    tokenXType: '0x2::sui::SUI',
    tokenYType: '0x2::sui::SUI',
    tickSpacing: 60,
  };

  it('allows MmtSDK.NEW with no arguments', () => {
    expect(() => MmtSDK.NEW()).not.toThrow();
  });

  it('rejects an inverted sqrt-price range before move calls', () => {
    const tx = new Transaction();
    expect(() =>
      sdk.Position.openPosition(tx, pool, '79226673515401279992447579050', '4295048017'),
    ).toThrow(/Invalid tick range/);
    expect(tx.getData().commands).toHaveLength(0);
  });

  it('rejects a negative swap amount before move calls', () => {
    const tx = new Transaction();
    expect(() =>
      sdk.Pool.swapV2({
        txb: tx,
        pool,
        amount: -1n,
        inputCoin: tx.object('0xcoin'),
        isXtoY: true,
      }),
    ).toThrow(/swap amount must be greater than or equal to 0/);
  });

  it('rejects NaN sqrt prices when resolving position status', () => {
    expect(() => getPositionStatus(Number.NaN, 1, 2)).toThrow(
      /Unable to determine position status/,
    );
  });
});
