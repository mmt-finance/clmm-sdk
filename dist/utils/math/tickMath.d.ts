import BN from 'bn.js';
import Decimal from 'decimal.js';
export declare function convertI32ToSigned(num: number): number;
export declare function convertSignedToI32(num: number): number;
export declare class TickMath {
    static priceToSqrtPriceX64(price: Decimal, decimalsA: number, decimalsB: number): BN;
    static sqrtPriceX64ToPrice(sqrtPriceX64: BN, decimalsA: number, decimalsB: number): Decimal;
    static tickIndexToSqrtPriceX64(tickIndex: number): BN;
    static sqrtPriceX64ToTickIndex(sqrtPriceX64: BN): number;
    static tickIndexToPrice(tickIndex: number, decimalsA: number, decimalsB: number): Decimal;
    static priceToTickIndex(price: Decimal, decimalsA: number, decimalsB: number): number;
    static priceToTickIndexWithTickSpacing(price: Decimal, decimalsA: number, decimalsB: number, tickSpacing: number): number;
    static sqrtPriceX64ToTickIndexWithTickSpacing(sqrtPriceX64: BN, tickSpacing: number): number;
    static tickIndexToSqrtPriceX64WithTickSpacing(tickIndex: number, tickSpacing: number, scaleUp?: boolean): BN;
    static priceToInitializableTickIndex(price: Decimal, decimalsA: number, decimalsB: number, tickSpacing: number): number;
    static getInitializableTickIndex(tickIndex: number, tickSpacing: number): number;
    /**
     *
     * @param tickIndex
     * @param tickSpacing
     * @returns
     */
    static getNextInitializableTickIndex(tickIndex: number, tickSpacing: number): number;
    static getPrevInitializableTickIndex(tickIndex: number, tickSpacing: number): number;
}
export declare function getTickDataFromUrlData(ticks: any): any[];
export declare function tickScore(tickIndex: number): Decimal;
