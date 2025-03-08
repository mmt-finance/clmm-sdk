import { MmtSDK } from '../src';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

export async function main() {
  // initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'testnet',
  });
  const senderAddress = '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871';
  const poolId = '0x53ceda0bbe1bdb3c1c0b1c53ecb49856f135a9fffc91e5a50aa4045a3f8240f7';
  const pool = await sdk.Pool.getPool(poolId);
  if (!pool) {
    throw new Error('Pool not found');
  }
  const userPositions = await sdk.Position.getAllUserPositions(senderAddress);
  if (!userPositions || userPositions.length === 0) {
    throw new Error('user has no position ');
  }
  const positionId = userPositions[0].objectId;

  const liquidity = await sdk.Position.getLiquidity(positionId);

  const tx = new Transaction();
  const poolParams = {
    objectId: poolId,
    tokenXType: pool.tokenXType,
    tokenYType: pool.tokenYType,
    tickSpacing: pool.tickSpacing,
  };

  sdk.Pool.removeLiquidity(
    tx,
    poolParams,
    userPositions[0].objectId,
    BigInt(liquidity), // < liquidity
    BigInt(0), // Min X amount based on slippage settings
    BigInt(0), // Min Y amount based on slippage settings
    senderAddress,
  );

  // Claim rewards and fees
  if (userPositions[0].rewarders && userPositions[0].rewarders.length !== 0) {
    sdk.Pool.collectAllRewards(tx, poolParams, pool.rewarders, positionId, senderAddress);
  }
  sdk.Pool.collectFee(tx, poolParams, positionId, senderAddress);

  // Close position
  sdk.Position.closePosition(tx, positionId);

  // Execute transaction
  const mnemonic = '';
  const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
  const result = await sdk.rpcClient.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });
  const responce = await sdk.rpcClient.waitForTransaction({ digest: result.digest });
}

main();
