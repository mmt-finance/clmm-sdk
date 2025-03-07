"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClmmpoolsError = exports.TypesErrorCode = exports.RouterErrorCode = exports.UtilsErrorCode = exports.ConfigErrorCode = exports.PartnerErrorCode = exports.PoolErrorCode = exports.PositionErrorCode = exports.SwapErrorCode = exports.CoinErrorCode = exports.MathErrorCode = void 0;
var MathErrorCode;
(function (MathErrorCode) {
    MathErrorCode["IntegerDowncastOverflow"] = "IntegerDowncastOverflow";
    MathErrorCode["MulOverflow"] = "MultiplicationOverflow";
    MathErrorCode["MulDivOverflow"] = "MulDivOverflow";
    MathErrorCode["MulShiftRightOverflow"] = "MulShiftRightOverflow";
    MathErrorCode["MulShiftLeftOverflow"] = "MulShiftLeftOverflow";
    MathErrorCode["DivideByZero"] = "DivideByZero";
    MathErrorCode["UnsignedIntegerOverflow"] = "UnsignedIntegerOverflow";
    MathErrorCode["InvalidCoinAmount"] = "InvalidCoinAmount";
    MathErrorCode["InvalidLiquidityAmount"] = "InvalidLiquidityAmount";
    MathErrorCode["InvalidReserveAmount"] = "InvalidReserveAmount";
    MathErrorCode["InvalidSqrtPrice"] = "InvalidSqrtPrice";
    MathErrorCode["NotSupportedThisCoin"] = "NotSupportedThisCoin";
    MathErrorCode["InvalidTwoTickIndex"] = "InvalidTwoTickIndex";
})(MathErrorCode || (exports.MathErrorCode = MathErrorCode = {}));
var CoinErrorCode;
(function (CoinErrorCode) {
    CoinErrorCode["CoinAmountMaxExceeded"] = "CoinAmountMaxExceeded";
    CoinErrorCode["CoinAmountMinSubceeded"] = "CoinAmountMinSubceeded ";
    CoinErrorCode["SqrtPriceOutOfBounds"] = "SqrtPriceOutOfBounds";
})(CoinErrorCode || (exports.CoinErrorCode = CoinErrorCode = {}));
var SwapErrorCode;
(function (SwapErrorCode) {
    SwapErrorCode["InvalidSqrtPriceLimitDirection"] = "InvalidSqrtPriceLimitDirection";
    SwapErrorCode["ZeroTradableAmount"] = "ZeroTradableAmount";
    SwapErrorCode["AmountOutBelowMinimum"] = "AmountOutBelowMinimum";
    SwapErrorCode["AmountInAboveMaximum"] = "AmountInAboveMaximum";
    SwapErrorCode["NextTickNotFound"] = "NextTickNoutFound";
    SwapErrorCode["TickArraySequenceInvalid"] = "TickArraySequenceInvalid";
    SwapErrorCode["TickArrayCrossingAboveMax"] = "TickArrayCrossingAboveMax";
    SwapErrorCode["TickArrayIndexNotInitialized"] = "TickArrayIndexNotInitialized";
    SwapErrorCode["ParamsLengthNotEqual"] = "ParamsLengthNotEqual";
})(SwapErrorCode || (exports.SwapErrorCode = SwapErrorCode = {}));
var PositionErrorCode;
(function (PositionErrorCode) {
    PositionErrorCode["InvalidTickEvent"] = "InvalidTickEvent";
    PositionErrorCode["InvalidPositionObject"] = "InvalidPositionObject";
    PositionErrorCode["InvalidPositionRewardObject"] = "InvalidPositionRewardObject";
})(PositionErrorCode || (exports.PositionErrorCode = PositionErrorCode = {}));
var PoolErrorCode;
(function (PoolErrorCode) {
    PoolErrorCode["InvalidCoinTypeSequence"] = "InvalidCoinTypeSequence";
    PoolErrorCode["InvalidTickIndex"] = "InvalidTickIndex";
    PoolErrorCode["InvalidPoolObject"] = "InvalidPoolObject";
    PoolErrorCode["InvalidTickObjectId"] = "InvalidTickObjectId";
    PoolErrorCode["InvalidTickObject"] = "InvalidTickObject";
    PoolErrorCode["InvalidTickFields"] = "InvalidTickFields";
})(PoolErrorCode || (exports.PoolErrorCode = PoolErrorCode = {}));
var PartnerErrorCode;
(function (PartnerErrorCode) {
    PartnerErrorCode["NotFoundPartnerObject"] = "NotFoundPartnerObject";
    PartnerErrorCode["InvalidParnterRefFeeFields"] = "InvalidParnterRefFeeFields";
})(PartnerErrorCode || (exports.PartnerErrorCode = PartnerErrorCode = {}));
var ConfigErrorCode;
(function (ConfigErrorCode) {
    ConfigErrorCode["InvalidConfig"] = "InvalidConfig";
    ConfigErrorCode["InvalidConfigHandle"] = "InvalidConfigHandle";
    ConfigErrorCode["InvalidSimulateAccount"] = "InvalidSimulateAccount";
})(ConfigErrorCode || (exports.ConfigErrorCode = ConfigErrorCode = {}));
var UtilsErrorCode;
(function (UtilsErrorCode) {
    UtilsErrorCode["InvalidSendAddress"] = "InvalidSendAddress";
    UtilsErrorCode["InvalidRecipientAddress"] = "InvalidRecipientAddress";
    UtilsErrorCode["InvalidRecipientAndAmountLength"] = "InvalidRecipientAndAmountLength";
    UtilsErrorCode["InsufficientBalance"] = "InsufficientBalance";
    UtilsErrorCode["InvalidTarget"] = "InvalidTarget";
    UtilsErrorCode["InvalidTransactionBuilder"] = "InvalidTransactionBuilder";
})(UtilsErrorCode || (exports.UtilsErrorCode = UtilsErrorCode = {}));
var RouterErrorCode;
(function (RouterErrorCode) {
    RouterErrorCode["InvalidCoin"] = "InvalidCoin";
    RouterErrorCode["NotFoundPath"] = "NotFoundPath";
    RouterErrorCode["NoDowngradeNeedParams"] = "NoDowngradeNeedParams";
    RouterErrorCode["InvalidSwapCountUrl"] = "InvalidSwapCountUrl";
    RouterErrorCode["InvalidTransactionBuilder"] = "InvalidTransactionBuilder";
})(RouterErrorCode || (exports.RouterErrorCode = RouterErrorCode = {}));
var TypesErrorCode;
(function (TypesErrorCode) {
    TypesErrorCode["InvalidType"] = "InvalidType";
})(TypesErrorCode || (exports.TypesErrorCode = TypesErrorCode = {}));
class ClmmpoolsError extends Error {
    constructor(message, errorCode) {
        super(message);
        this.message = message;
        this.errorCode = errorCode;
    }
    static isClmmpoolsErrorCode(e, code) {
        return e instanceof ClmmpoolsError && e.errorCode === code;
    }
}
exports.ClmmpoolsError = ClmmpoolsError;
