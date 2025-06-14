import { PoolModule } from '../src/modules/poolModule';
import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { TxHelper } from './transaction';
import { DryRunTransactionBlockResponse } from '@mysten/sui/client';
import { describe, test, beforeEach, expect } from '@jest/globals';

describe('PoolModule.swap', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;
  const suiClientUrl = 'https://fullnode.mainnet.sui.io:443';

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
      suiClientUrl: suiClientUrl,
    });

    poolModule = sdk.Pool;
  });

  test('should execute swap correctly', async () => {
    const client = new SuiClient({ url: suiClientUrl });
    const txb = new Transaction();
    const poolId = '0x455cf8d2ac91e7cb883f515874af750ed3cd18195c970b7a2d46235ac2b0c388';
    const pool = await poolModule.getPool(poolId);
    if (!pool) {
      throw new Error('Pool not found');
    }
    const coinType = pool.tokenX.coinType;
    const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
    const swapAmount = '10';
    const coin = await TxHelper.prepareCoin(txb, client, coinType, swapAmount, senderAddress);

    poolModule.swap(
      txb,
      {
        objectId: poolId,
        tokenXType: pool.tokenX.coinType,
        tokenYType: pool.tokenY.coinType,
        tickSpacing: pool.tickSpacing,
      },
      BigInt(swapAmount),
      coin,
      true,
      senderAddress,
    );
    txb.setSender(senderAddress);
    const txBytes = await txb.build({ client: client });
    const resp: DryRunTransactionBlockResponse = await client.dryRunTransactionBlock({
      transactionBlock: txBytes,
    });
    expect(resp.effects.status.status).toBe('success');
  }, 30000);
});
