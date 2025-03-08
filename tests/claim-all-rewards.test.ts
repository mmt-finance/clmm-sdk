import { MmtSDK } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import { DryRunTransactionBlockResponse } from '@mysten/sui/client';
import { fetchUserObjectsByPkg } from '../src/utils/poolUtils';

describe('PoolModule.collectAllPoolsRewards', () => {
  let sdk: MmtSDK;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'testnet',
    });
  });

  it('positive', async () => {
    const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
    let eventCount = 0;
    const objects = await fetchUserObjectsByPkg(
      sdk.rpcClient,
      sdk.contractConst.publishedAt,
      senderAddress,
    );
    const positions = objects.filter(
      (obj: any) => obj.type === `${sdk.PackageId}::position::Position`,
    );
    const pools = await sdk.Pool.getAllPools(); // Get AllPools detail using sdk

    positions.map((position: any) => {
      const positionData = position.fields;
      const pool_id = positionData.pool_id;
      const pool = pools.find((pool) => pool.poolId === pool_id);
      const rewarders = pool.rewarders;

      if (rewarders?.length > 0) {
        eventCount += rewarders.length;
      }
      eventCount++;
    });

    const tx = await sdk.Pool.collectAllPoolsRewards(senderAddress, pools);
    tx.setSender(senderAddress);
    const txBytes = await tx.build({ client: sdk.rpcClient });
    const resp: DryRunTransactionBlockResponse = await sdk.rpcClient.dryRunTransactionBlock({
      transactionBlock: txBytes,
    });
    expect(resp.effects.status.status).toBe('success');
    expect(resp.events.length).toEqual(eventCount);
  }, 30000);
});
