export declare enum MathErrorCode {
    IntegerDowncastOverflow = "IntegerDowncastOverflow",
    MulOverflow = "MultiplicationOverflow",
    MulDivOverflow = "MulDivOverflow",
    MulShiftRightOverflow = "MulShiftRightOverflow",
    MulShiftLeftOverflow = "MulShiftLeftOverflow",
    DivideByZero = "DivideByZero",
    UnsignedIntegerOverflow = "UnsignedIntegerOverflow",
    InvalidCoinAmount = "InvalidCoinAmount",
    InvalidLiquidityAmount = "InvalidLiquidityAmount",
    InvalidReserveAmount = "InvalidReserveAmount",
    InvalidSqrtPrice = "InvalidSqrtPrice",
    NotSupportedThisCoin = "NotSupportedThisCoin",
    InvalidTwoTickIndex = "InvalidTwoTickIndex"
}
export declare enum CoinErrorCode {
    CoinAmountMaxExceeded = "CoinAmountMaxExceeded",
    CoinAmountMinSubceeded = "CoinAmountMinSubceeded ",
    SqrtPriceOutOfBounds = "SqrtPriceOutOfBounds"
}
export declare enum SwapErrorCode {
    InvalidSqrtPriceLimitDirection = "InvalidSqrtPriceLimitDirection",
    ZeroTradableAmount = "ZeroTradableAmount",
    AmountOutBelowMinimum = "AmountOutBelowMinimum",
    AmountInAboveMaximum = "AmountInAboveMaximum",
    NextTickNotFound = "NextTickNoutFound",
    TickArraySequenceInvalid = "TickArraySequenceInvalid",
    TickArrayCrossingAboveMax = "TickArrayCrossingAboveMax",
    TickArrayIndexNotInitialized = "TickArrayIndexNotInitialized",
    ParamsLengthNotEqual = "ParamsLengthNotEqual"
}
export declare enum PositionErrorCode {
    InvalidTickEvent = "InvalidTickEvent",
    InvalidPositionObject = "InvalidPositionObject",
    InvalidPositionRewardObject = "InvalidPositionRewardObject"
}
export declare enum PoolErrorCode {
    InvalidCoinTypeSequence = "InvalidCoinTypeSequence",
    InvalidTickIndex = "InvalidTickIndex",
    InvalidPoolObject = "InvalidPoolObject",
    InvalidTickObjectId = "InvalidTickObjectId",
    InvalidTickObject = "InvalidTickObject",
    InvalidTickFields = "InvalidTickFields"
}
export declare enum PartnerErrorCode {
    NotFoundPartnerObject = "NotFoundPartnerObject",
    InvalidParnterRefFeeFields = "InvalidParnterRefFeeFields"
}
export declare enum ConfigErrorCode {
    InvalidConfig = "InvalidConfig",
    InvalidConfigHandle = "InvalidConfigHandle",
    InvalidSimulateAccount = "InvalidSimulateAccount"
}
export declare enum UtilsErrorCode {
    InvalidSendAddress = "InvalidSendAddress",
    InvalidRecipientAddress = "InvalidRecipientAddress",
    InvalidRecipientAndAmountLength = "InvalidRecipientAndAmountLength",
    InsufficientBalance = "InsufficientBalance",
    InvalidTarget = "InvalidTarget",
    InvalidTransactionBuilder = "InvalidTransactionBuilder"
}
export declare enum RouterErrorCode {
    InvalidCoin = "InvalidCoin",
    NotFoundPath = "NotFoundPath",
    NoDowngradeNeedParams = "NoDowngradeNeedParams",
    InvalidSwapCountUrl = "InvalidSwapCountUrl",
    InvalidTransactionBuilder = "InvalidTransactionBuilder"
}
export declare enum TypesErrorCode {
    InvalidType = "InvalidType"
}
export type ClmmpoolsErrorCode = MathErrorCode | SwapErrorCode | CoinErrorCode | PoolErrorCode | PositionErrorCode | PartnerErrorCode | ConfigErrorCode | UtilsErrorCode | RouterErrorCode | TypesErrorCode;
export declare class ClmmpoolsError extends Error {
    message: string;
    errorCode?: ClmmpoolsErrorCode;
    constructor(message: string, errorCode?: ClmmpoolsErrorCode);
    static isClmmpoolsErrorCode(e: any, code: ClmmpoolsErrorCode): boolean;
}
