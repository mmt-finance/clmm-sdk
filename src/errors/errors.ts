export enum MathErrorCode {
  IntegerDowncastOverflow = `IntegerDowncastOverflow`,
  MulOverflow = `MultiplicationOverflow`,
  MulDivOverflow = `MulDivOverflow`,
  MulShiftRightOverflow = `MulShiftRightOverflow`,
  MulShiftLeftOverflow = `MulShiftLeftOverflow`,
  DivideByZero = `DivideByZero`,
  UnsignedIntegerOverflow = `UnsignedIntegerOverflow`,
  InvalidCoinAmount = `InvalidCoinAmount`,
  InvalidLiquidityAmount = `InvalidLiquidityAmount`,
  InvalidReserveAmount = `InvalidReserveAmount`,
  InvalidSqrtPrice = `InvalidSqrtPrice`,
  NotSupportedThisCoin = `NotSupportedThisCoin`,
  InvalidTwoTickIndex = `InvalidTwoTickIndex`,
}

export enum CoinErrorCode {
  CoinAmountMaxExceeded = `CoinAmountMaxExceeded`,
  CoinAmountMinSubceeded = `CoinAmountMinSubceeded `,
  SqrtPriceOutOfBounds = `SqrtPriceOutOfBounds`,
}

export enum SwapErrorCode {
  InvalidSqrtPriceLimitDirection = `InvalidSqrtPriceLimitDirection`,
  ZeroTradableAmount = `ZeroTradableAmount`,
  AmountOutBelowMinimum = `AmountOutBelowMinimum`,
  AmountInAboveMaximum = `AmountInAboveMaximum`,
  NextTickNotFound = `NextTickNoutFound`,
  TickArraySequenceInvalid = `TickArraySequenceInvalid`,
  TickArrayCrossingAboveMax = `TickArrayCrossingAboveMax`,
  TickArrayIndexNotInitialized = `TickArrayIndexNotInitialized`,
  ParamsLengthNotEqual = `ParamsLengthNotEqual`,
}

export enum PositionErrorCode {
  InvalidTickEvent = `InvalidTickEvent`,
  InvalidPositionObject = `InvalidPositionObject`,
  InvalidPositionRewardObject = `InvalidPositionRewardObject`,
}

export enum PoolErrorCode {
  InvalidCoinTypeSequence = `InvalidCoinTypeSequence`,
  InvalidTickIndex = `InvalidTickIndex`,
  InvalidPoolObject = `InvalidPoolObject`,
  InvalidTickObjectId = `InvalidTickObjectId`,
  InvalidTickObject = `InvalidTickObject`,
  InvalidTickFields = `InvalidTickFields`,
}

export enum PartnerErrorCode {
  NotFoundPartnerObject = `NotFoundPartnerObject`,
  InvalidParnterRefFeeFields = `InvalidParnterRefFeeFields`,
}

export enum ConfigErrorCode {
  InvalidConfig = `InvalidConfig`,
  InvalidConfigHandle = `InvalidConfigHandle`,
  InvalidSimulateAccount = `InvalidSimulateAccount`,
}

export enum UtilsErrorCode {
  InvalidSendAddress = `InvalidSendAddress`,
  InvalidRecipientAddress = `InvalidRecipientAddress`,
  InvalidRecipientAndAmountLength = `InvalidRecipientAndAmountLength`,
  InsufficientBalance = `InsufficientBalance`,
  InvalidTarget = `InvalidTarget`,
  InvalidTransactionBuilder = `InvalidTransactionBuilder`,
}

export enum RouterErrorCode {
  InvalidCoin = `InvalidCoin`,
  NotFoundPath = `NotFoundPath`,
  NoDowngradeNeedParams = `NoDowngradeNeedParams`,
  InvalidSwapCountUrl = `InvalidSwapCountUrl`,
  InvalidTransactionBuilder = `InvalidTransactionBuilder`,
}

export enum TypesErrorCode {
  InvalidType = `InvalidType`,
}

export type ClmmPoolsErrorCode =
  | MathErrorCode
  | SwapErrorCode
  | CoinErrorCode
  | PoolErrorCode
  | PositionErrorCode
  | PartnerErrorCode
  | ConfigErrorCode
  | UtilsErrorCode
  | RouterErrorCode
  | TypesErrorCode;

export class ClmmPoolsError extends Error {
  override message: string;

  errorCode?: ClmmPoolsErrorCode;

  constructor(message: string, errorCode?: ClmmPoolsErrorCode) {
    super(message);
    this.message = message;
    this.errorCode = errorCode;
  }

  static isClmmPoolsErrorCode(e: any, code: ClmmPoolsErrorCode): boolean {
    return e instanceof ClmmPoolsError && e.errorCode === code;
  }
}
