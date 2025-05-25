import Decimal from 'decimal.js';
import { ExtendedPoolWithApr, RewardersAPYSchema, TokenSchema } from '../types';
import { MathUtil } from './math/commonMath';
import BN from 'bn.js';
import { convertI32ToSigned, TickMath } from './math/tickMath';
import { SuiClient, SuiParsedData } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';
import { ModuleConstants } from './constants';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { MmtSDK } from '../sdk';

type LiquidityInput = {
  /**
   * The amount of coin A.
   */
  coinAmountA: BN;

  /**
   * The amount of coin B.
   */
  coinAmountB: BN;

  /**
   * The maximum amount of token A.
   */
  tokenMaxA: BN;

  /**
   * The maximum amount of token B.
   */
  tokenMaxB: BN;

  /**
   * The liquidity amount.
   */
  liquidityAmount: BN;

  fix_amount_a: boolean;
};

export async function fetchAllPoolsApi(baseUrl: string, headers?: HeadersInit) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const options = {
    method: 'GET',
    headers: mergedHeaders,
    body: null as null | string,
  };

  const response = await fetch(`${baseUrl}/pools/v3`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json())?.data as ExtendedPoolWithApr[];
}

export async function fetchPoolApi(baseUrl: string, poolId: string, headers?: HeadersInit) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const options = {
    method: 'GET',
    headers: mergedHeaders,
    body: null as null | string,
  };

  const response = await fetch(`${baseUrl}/pools/v3/${poolId}`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json())?.data as ExtendedPoolWithApr;
}

export async function fetchAllTokenApi(baseUrl: string, headers?: HeadersInit) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const options = {
    method: 'GET',
    headers: mergedHeaders,
    body: null as null | string,
  };

  const response = await fetch(`${baseUrl}/tokens`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json())?.data as TokenSchema[];
}

export async function fetchTokenApi(baseUrl: string, tokenid: string, headers?: HeadersInit) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const options = {
    method: 'GET',
    headers: mergedHeaders,
    body: null as null | string,
  };

  const response = await fetch(`${baseUrl}/tokens/${tokenid}`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json())?.data as TokenSchema;
}

export async function fetchTickLiquidityApi(
  baseUrl: string,
  poolId: string,
  limit: number,
  offset: number,
  headers?: HeadersInit,
) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const mergedHeaders = { ...defaultHeaders, ...headers };
  const method = 'GET';
  const options = {
    method,
    mergedHeaders,
    body: null as null | string,
  };
  const url = `${baseUrl}/tickLiquidity/${poolId}?limit=${limit}&offset=${offset}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return await response.json();
}

export async function fetchRewardersApy(baseUrl: string, poolId: string, headers?: HeadersInit) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = { ...defaultHeaders, ...headers };
  const options = {
    method: 'GET',
    headers: mergedHeaders,
    body: null as null | string,
  };

  const response = await fetch(`${baseUrl}/pools/v3/rewarders-apy/${poolId}`, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const responseText = await response.text();
  if (!responseText) {
    throw new Error(`responseText is null`);
  }

  const responseData = JSON.parse(responseText);
  return responseData as RewardersAPYSchema;
}

export function getCoinAmountFromLiquidity(
  liquidity: BN,
  curSqrtPrice: BN,
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  roundUp: boolean,
): {
  coinA: BN;
  coinB: BN;
} {
  const liq = new Decimal(liquidity.toString());
  const curSqrtPriceStr = new Decimal(curSqrtPrice.toString());
  const lowerPriceStr = new Decimal(lowerSqrtPrice.toString());
  const upperPriceStr = new Decimal(upperSqrtPrice.toString());
  let coinA;
  let coinB;
  if (curSqrtPrice.lt(lowerSqrtPrice)) {
    coinA = MathUtil.toX64_Decimal(liq)
      .mul(upperPriceStr.sub(lowerPriceStr))
      .div(lowerPriceStr.mul(upperPriceStr));
    coinB = new Decimal(0);
  } else if (curSqrtPrice.lt(upperSqrtPrice)) {
    coinA = MathUtil.toX64_Decimal(liq)
      .mul(upperPriceStr.sub(curSqrtPriceStr))
      .div(curSqrtPriceStr.mul(upperPriceStr));

    coinB = MathUtil.fromX64_Decimal(liq.mul(curSqrtPriceStr.sub(lowerPriceStr)));
  } else {
    coinA = new Decimal(0);
    coinB = MathUtil.fromX64_Decimal(liq.mul(upperPriceStr.sub(lowerPriceStr)));
  }

  if (roundUp) {
    return {
      coinA: new BN(coinA.ceil().toString()),
      coinB: new BN(coinB.ceil().toString()),
    };
  }
  return {
    coinA: new BN(coinA.floor().toString()),
    coinB: new BN(coinB.floor().toString()),
  };
}

export function getCoinXYForLiquidity(
  liquidity: Decimal.Instance,
  reserveInSize: Decimal.Instance,
  reserveOutSize: Decimal.Instance,
  lpSuply: Decimal.Instance,
) {
  if (liquidity.lessThanOrEqualTo(0)) {
    throw new Error("liquidity can't be equal or less than zero");
  }

  if (reserveInSize.lessThanOrEqualTo(0) || reserveOutSize.lessThanOrEqualTo(0)) {
    throw new Error('reserveInSize or reserveOutSize can not be equal or less than zero');
  }

  // const sqrtSupply = reserveInSize.mul(reserveOutSize).sqrt()
  const sqrtSupply = lpSuply;
  const coinXAmount = liquidity.div(sqrtSupply).mul(reserveInSize);
  const coinYAmount = liquidity.div(sqrtSupply).mul(reserveOutSize);

  return {
    coinXAmount,
    coinYAmount,
  };
}

export function estimateLiquidityForCoinA(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN) {
  const lowerSqrtPriceX64 = BN.min(sqrtPriceX, sqrtPriceY);
  const upperSqrtPriceX64 = BN.max(sqrtPriceX, sqrtPriceY);
  const num = MathUtil.fromX64_BN(coinAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64));
  const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
  return num.div(dem);
}

export function estimateLiquidityForCoinB(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN) {
  const lowerSqrtPriceX64 = BN.min(sqrtPriceX, sqrtPriceY);
  const upperSqrtPriceX64 = BN.max(sqrtPriceX, sqrtPriceY);
  const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
  return coinAmount.shln(64).div(delta);
}

export function estLiquidityAndcoinAmountFromOneAmounts(
  lowerTick: number,
  upperTick: number,
  coinAmount: BN,
  iscoinA: boolean,
  roundUp: boolean,
  slippage: number,
  curSqrtPrice: BN,
): LiquidityInput {
  const currentTick = convertI32ToSigned(TickMath.sqrtPriceX64ToTickIndex(curSqrtPrice));
  const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick);
  const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick);
  let liquidity;
  if (currentTick < lowerTick) {
    if (!iscoinA) {
      throw new Error('lower tick cannot calculate liquidity by coinB');
    }
    liquidity = estimateLiquidityForCoinA(lowerSqrtPrice, upperSqrtPrice, coinAmount);
  } else if (currentTick > upperTick) {
    if (iscoinA) {
      throw new Error('upper tick cannot calculate liquidity by coinA');
    }
    liquidity = estimateLiquidityForCoinB(upperSqrtPrice, lowerSqrtPrice, coinAmount);
  } else if (iscoinA) {
    liquidity = estimateLiquidityForCoinA(curSqrtPrice, upperSqrtPrice, coinAmount);
  } else {
    liquidity = estimateLiquidityForCoinB(curSqrtPrice, lowerSqrtPrice, coinAmount);
  }
  const coinAmounts = getCoinAmountFromLiquidity(
    liquidity,
    curSqrtPrice,
    lowerSqrtPrice,
    upperSqrtPrice,
    roundUp,
  );
  const tokenLimitA = roundUp
    ? new Decimal(coinAmounts.coinA.toString()).mul(1 + slippage).toString()
    : new Decimal(coinAmounts.coinA.toString()).mul(1 - slippage).toString();

  const tokenLimitB = roundUp
    ? new Decimal(coinAmounts.coinB.toString()).mul(1 + slippage).toString()
    : new Decimal(coinAmounts.coinB.toString()).mul(1 - slippage).toString();

  return {
    coinAmountA: new BN(coinAmounts.coinA),
    coinAmountB: new BN(coinAmounts.coinB),
    tokenMaxA: roundUp
      ? new BN(Decimal.ceil(tokenLimitA).toString())
      : new BN(Decimal.floor(tokenLimitA).toString()),
    tokenMaxB: roundUp
      ? new BN(Decimal.ceil(tokenLimitB).toString())
      : new BN(Decimal.floor(tokenLimitB).toString()),
    liquidityAmount: liquidity,
    fix_amount_a: iscoinA,
  };
}

export const fetchUserObjectsByPkg = async (
  client: SuiClient,
  packageId: string,
  address: string,
): Promise<SuiParsedData[]> => {
  try {
    let cursor: string | null = null;
    let hasNextPage = true;
    let data: SuiParsedData[] = [];

    while (hasNextPage) {
      const response = await client?.getOwnedObjects({
        owner: address,
        cursor: cursor,
        filter: {
          Package: packageId,
        },
        options: {
          showContent: true,
        },
      });
      if (!response) {
        return [];
      }
      data = [...data, ...response.data.map((d) => d?.data?.content)];
      hasNextPage = response.hasNextPage;
      cursor = response.nextCursor;
    }
    return data;
  } catch (error) {
    console.error('Error fetching owned objects:', error);
    throw error;
  }
};

export const handleMmtCetusSwap = (
  swapCoinA,
  swapCoinB,
  swapAmt,
  typeX: string,
  typeY: string,
  isCetusReverse,
  isCetusSwap: boolean,
  isV3Reverse: boolean,
  cetusPoolId: string,
  mmtPoolId: string,
  txb: Transaction,
) => {
  const sdk = MmtSDK.NEW({ network: 'mainnet' });

  if (isCetusSwap) {
    if (isCetusReverse) {
      let [resCoinB, resCoinA] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::adapters::cetus_adapter`,
        typeArguments: [typeX, typeY],
        arguments: [
          swapCoinB,
          swapCoinA,
          swapAmt,
          txb.object(cetusPoolId),
          txb.object(ModuleConstants.CETUS_GLOBAL_CONFIG_ID),
          txb.object(normalizeSuiObjectId('0x6')),
        ],
      });
      return { resCoinA, resCoinB };
    } else {
      let [resCoinA, resCoinB] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::adapters::cetus_adapter`,
        typeArguments: [typeX, typeY],
        arguments: [
          swapCoinA,
          swapCoinB,
          swapAmt,
          txb.object(cetusPoolId),
          txb.object(ModuleConstants.CETUS_GLOBAL_CONFIG_ID),
          txb.object(normalizeSuiObjectId('0x6')),
        ],
      });
      return { resCoinA, resCoinB };
    }
  } else {
    if (isV3Reverse) {
      let [resCoinB, resCoinA] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::adapters::mmt_adapter`,
        typeArguments: [typeX, typeY],
        arguments: [
          swapCoinB,
          swapCoinA,
          swapAmt,
          txb.object(mmtPoolId),
          txb.object(sdk.contractConst.versionId),
          txb.object(normalizeSuiObjectId('0x6')),
        ],
      });
      return { resCoinA, resCoinB };
    } else {
      let [resCoinA, resCoinB] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::adapters::mmt_adapter`,
        typeArguments: [typeX, typeY],
        arguments: [
          swapCoinA,
          swapCoinB,
          swapAmt,
          txb.object(mmtPoolId),
          txb.object(sdk.contractConst.versionId),
          txb.object(normalizeSuiObjectId('0x6')),
        ],
      });
      return { resCoinA, resCoinB };
    }
  }
};

// momentumV2 pool id -> MomentumV3 pool id
export const mappedMmtV3Pool = {
  '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
    id: '0x367e02acb99632e18db69c3e93d89d21eb721e1d1fcebc0f6853667337450acc',
    isReverse: true,
    lowerScale: '13043692734520023948',
    upperScale: '22591727467072087864',
  },
  '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
    id: '0xc83d3c409375cb05fbe6a7f30a4f0da4aa75bda3352a08d2285216ef1a470267',
    isReverse: false,
    lowerScale: '18353810417316872927',
    upperScale: '18583564898576848757',
  },
  '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
    id: '0xf1b6a7534027b83e9093bec35d66224daa75ea221d555c79b499f88c93ea58a9',
    isReverse: false,
    lowerScale: '18353810417316872927',
    upperScale: '18583564898576848757',
  },
  '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
    id: '0x6b9b2ff862d54ed619e4d59ba8cc509d9a6f7ba1c113a301280cca6e66181d04',
    isReverse: false,
    lowerScale: '13043692734520023948',
    upperScale: '22591727467072087864',
  },
};
// momentumV2 pool id -> Cetus pool id
export const mappedCetusPool = {
  '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
    id: '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630',
    isCetus: true,
    isCetusReverse: false,
  },
  '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
    id: '0xc8d7a1503dc2f9f5b05449a87d8733593e2f0f3e7bffd90541252782e4d2ca20',
    isCetus: true,
    isCetusReverse: true,
  },
  '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
    id: '0x6c545e78638c8c1db7a48b282bb8ca79da107993fcb185f75cedc1f5adb2f535',
    isCetus: true,
    isCetusReverse: false,
  },
  '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
    id: '0x5b0b24c27ccf6d0e98f3a8704d2e577de83fa574d3a9060eb8945eeb82b3e2df',
    isCetus: true,
    isCetusReverse: false,
  },
};
