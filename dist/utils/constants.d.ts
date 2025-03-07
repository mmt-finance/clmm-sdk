import BN from 'bn.js';
export declare class ModuleConstants {
    static readonly migrationPackageId = "0x54ed634a018904b66871bd30e9b9ccafcf9bfc192aa84c06b0931276c7afd22b";
    static readonly suiCoinType = "0x2::sui::SUI";
    static readonly CETUS_GLOBAL_CONFIG_ID = "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";
    static readonly functions: {
        swapX: string;
        swapY: string;
    };
}
export declare const MAX_TICK_INDEX = 443636;
export declare const MIN_TICK_INDEX = -443636;
export declare const MAX_SQRT_PRICE = "79226673515401279992447579055";
export declare const TICK_ARRAY_SIZE = 64;
export declare const MIN_SQRT_PRICE = "4295048016";
export declare const FEE_RATE_DENOMINATOR: BN;
