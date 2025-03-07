import Decimal from 'decimal.js';
import { ExtendedPool, RewardersAPYSchema, TokenSchema } from '../types';
import BN from 'bn.js';
import { SuiClient, SuiParsedData } from '@mysten/sui/dist/cjs/client';
import { Transaction } from '@mysten/sui/transactions';
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
export declare function fetchAllPoolsApi(baseUrl: string, headers?: HeadersInit): Promise<ExtendedPool[]>;
export declare function fetchPoolApi(baseUrl: string, poolId: string, headers?: HeadersInit): Promise<ExtendedPool>;
export declare function fetchAllTokenApi(baseUrl: string, headers?: HeadersInit): Promise<TokenSchema[]>;
export declare function fetchTokenApi(baseUrl: string, tokenid: string, headers?: HeadersInit): Promise<TokenSchema>;
export declare function fetchTickLiquidityApi(baseUrl: string, poolId: string, limit: number, offset: number): Promise<any>;
export declare function fetchRewardersApy(baseUrl: string, poolId: string, headers?: HeadersInit): Promise<RewardersAPYSchema | RewardersAPYSchema[]>;
export declare function getCoinAmountFromLiquidity(liquidity: BN, curSqrtPrice: BN, lowerSqrtPrice: BN, upperSqrtPrice: BN, roundUp: boolean): {
    coinA: BN;
    coinB: BN;
};
export declare function getCoinXYForLiquidity(liquidity: Decimal.Instance, reserveInSize: Decimal.Instance, reserveOutSize: Decimal.Instance, lpSuply: Decimal.Instance): {
    coinXAmount: Decimal;
    coinYAmount: Decimal;
};
export declare function estimateLiquidityForCoinA(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN): BN;
export declare function estimateLiquidityForCoinB(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN): BN;
export declare function estLiquidityAndcoinAmountFromOneAmounts(lowerTick: number, upperTick: number, coinAmount: BN, iscoinA: boolean, roundUp: boolean, slippage: number, curSqrtPrice: BN): LiquidityInput;
export declare const fetchUserObjectsByPkg: (client: SuiClient, packageId: string, address: string) => Promise<SuiParsedData[]>;
export declare const handleMmtCetusSwap: (swapCoinA: any, swapCoinB: any, swapAmt: any, typeX: string, typeY: string, isCetusReverse: any, isCetusSwap: boolean, isV3Reverse: boolean, cetusPoolId: string, mmtPoolId: string, txb: Transaction) => {
    resCoinA: {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
    resCoinB: {
        $kind: "NestedResult";
        NestedResult: [number, number];
    };
};
export declare const mappedMmtV3Pool: {
    '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
        id: string;
        isReverse: boolean;
        lowerScale: string;
        upperScale: string;
    };
    '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
        id: string;
        isReverse: boolean;
        lowerScale: string;
        upperScale: string;
    };
    '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
        id: string;
        isReverse: boolean;
        lowerScale: string;
        upperScale: string;
    };
    '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
        id: string;
        isReverse: boolean;
        lowerScale: string;
        upperScale: string;
    };
};
export declare const mappedCetusPool: {
    '0x5af4976b871fa1813362f352fa4cada3883a96191bb7212db1bd5d13685ae305': {
        id: string;
        isCetus: boolean;
        isCetusReverse: boolean;
    };
    '0xd0086b7713e0487bbf5bb4a1e30a000794e570590a6041155cdbebee3cb1cb77': {
        id: string;
        isCetus: boolean;
        isCetusReverse: boolean;
    };
    '0xf385dee283495bb70500f5f8491047cd5a2ef1b7ff5f410e6dfe8a3c3ba58716': {
        id: string;
        isCetus: boolean;
        isCetusReverse: boolean;
    };
    '0x43ca1a6de20d7feabcaa460ac3798a6fdc754d3a83b49dff93221612c1370dcc': {
        id: string;
        isCetus: boolean;
        isCetusReverse: boolean;
    };
};
export {};
