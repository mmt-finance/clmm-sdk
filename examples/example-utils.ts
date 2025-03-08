import BN from 'bn.js';
import { MathUtil } from '../src/utils/math/commonMath';
import Decimal from 'decimal.js';
import { Transaction } from '@mysten/sui/transactions';
import { MmtSDK } from '../src';
import { Signer } from '@mysten/sui/cryptography';

export async function executeTxExample({
  tx,
  sdk,
  execution,
}: {
  tx: Transaction;
  sdk: MmtSDK;
  execution: { dryRun: false; signer: Signer } | { dryRun: true; address: string };
}) {
  if (execution.dryRun === true) {
    tx.setSender(execution.address);
    const txBytes = await tx.build({ client: sdk.rpcClient });
    return await sdk.rpcClient.dryRunTransactionBlock({
      transactionBlock: txBytes,
    });
  }
  const result = await sdk.rpcClient.signAndExecuteTransaction({
    signer: execution.signer,
    transaction: tx,
  });
  return await sdk.rpcClient.waitForTransaction({ digest: result.digest });
}

export function estimateLiquidityForCoinA(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN) {
  const lowerSqrtPriceX64 = BN.min(sqrtPriceX, sqrtPriceY);
  const upperSqrtPriceX64 = BN.max(sqrtPriceX, sqrtPriceY);
  const num = MathUtil.fromX64_BN(coinAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64));
  const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
  return num.div(dem);
}

export function getCoinAmountFromLiquidity(
  liquidity: BN,
  curSqrtPrice: BN,
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  roundUp: boolean,
): {
  coinX: string;
  coinY: string;
} {
  const liq = new Decimal(liquidity.toString());
  const curSqrtPriceStr = new Decimal(curSqrtPrice.toString());
  const lowerPriceStr = new Decimal(lowerSqrtPrice.toString());
  const upperPriceStr = new Decimal(upperSqrtPrice.toString());
  let coinX;
  let coinY;
  if (curSqrtPrice.lt(lowerSqrtPrice)) {
    coinX = MathUtil.toX64_Decimal(liq)
      .mul(upperPriceStr.sub(lowerPriceStr))
      .div(lowerPriceStr.mul(upperPriceStr));
    coinY = new Decimal(0);
  } else if (curSqrtPrice.lt(upperSqrtPrice)) {
    coinX = MathUtil.toX64_Decimal(liq)
      .mul(upperPriceStr.sub(curSqrtPriceStr))
      .div(curSqrtPriceStr.mul(upperPriceStr));

    coinY = MathUtil.fromX64_Decimal(liq.mul(curSqrtPriceStr.sub(lowerPriceStr)));
  } else {
    coinX = new Decimal(0);
    coinY = MathUtil.fromX64_Decimal(liq.mul(upperPriceStr.sub(lowerPriceStr)));
  }

  if (roundUp) {
    return {
      coinX: coinX.ceil().toString(),
      coinY: coinY.ceil().toString(),
    };
  }
  return {
    coinX: coinX.floor().toString(),
    coinY: coinY.floor().toString(),
  };
}

export async function getPoolAndLiquidity(poolId: string, sdk: MmtSDK, senderAddress: string) {
  const pool = await sdk.Pool.getPool(poolId);
  if (!pool) {
    throw new Error('Pool not found');
  }
  const userPositions = await sdk.Position.getAllUserPositions(senderAddress);
  if (!userPositions || userPositions.length === 0) {
    throw new Error('user has no position ');
  }
  const position = userPositions.find((pos) => pos.poolId === poolId);
  if (!position) {
    throw new Error('No matching position found');
  }

  return { pool, position, positionId: position.objectId };
}
