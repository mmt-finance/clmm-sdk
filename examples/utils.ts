import * as BN from 'bn.js';
import { MathUtil } from '../src/utils/math/commonMath';
import Decimal from 'decimal.js';

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
