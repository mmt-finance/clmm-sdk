import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from '@mysten/sui/transactions';
import { ModuleConstants } from '../utils/constants';
import {
  PoolParams,
  TickLiquidity,
  ExtendedPool,
  Rewarder,
  TokenSchema,
  ExtendedPoolWithApr,
  PreSwapParam,
  NormalizedRewarder,
} from '../types';
import { MmtSDK } from '../sdk';
import { BaseModule } from '../interfaces/BaseModule';
import { txnArgument } from '../utils/common';
import { normalizeSuiAddress, normalizeSuiObjectId, parseStructTag } from '@mysten/sui/utils';
import { SuiObjectResponse } from '@mysten/sui/client';
import {
  estLiquidityAndcoinAmountFromOneAmounts,
  fetchAllPoolsApi,
  fetchAllTokenApi,
  fetchPoolApi,
  fetchRewardersApy,
  fetchTickLiquidityApi,
  fetchTokenApi,
  fetchUserObjectsByPkg,
  getLimitSqrtPriceUsingSlippage,
  handleMmtCetusSwap,
} from '../utils/poolUtils';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { convertI32ToSigned, TickMath } from '../utils/math/tickMath';
import { MathUtil } from '../utils/math/commonMath';
import { bcs } from '@mysten/sui/bcs';
import { applyMvrPackage } from '../utils/mvr/utils';
import { formatCoinType, isSUICoin, mergeCoins } from '../utils/coinUtils';
import { CLAIM_ROUTES } from '../constants/claim-routes';

export const Q_64 = '18446744073709551616';
export class PoolModule implements BaseModule {
  protected _sdk: MmtSDK;

  constructor(sdk: MmtSDK) {
    this._sdk = sdk;
  }

  get sdk() {
    return this._sdk;
  }

  public createPool(
    txb: Transaction,
    fee_rate: number,
    price: string,
    coinXType: string,
    coinYType: string,
    decimalsX: number,
    decimalsY: number,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [pool] = txb.moveCall({
      target: `${targetPackage}::create_pool::new`,
      typeArguments: [coinXType, coinYType],
      arguments: [
        txb.object(this.sdk.contractConst.globalConfigId),
        txb.pure.u64(fee_rate),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    const sqrtPrice = TickMath.priceToSqrtPriceX64(new Decimal(price), decimalsX, decimalsY);
    txb.moveCall({
      target: `${targetPackage}::pool::initialize`,
      typeArguments: [coinXType, coinYType],
      arguments: [
        pool,
        txb.pure.u128(BigInt(sqrtPrice.toString())),
        txb.object(normalizeSuiObjectId('0x6')),
      ],
    });

    txb.moveCall({
      target: `${targetPackage}::pool::transfer`,
      typeArguments: [coinXType, coinYType],
      arguments: [pool],
    });
  }

  public swap(
    txb: Transaction,
    pool: PoolParams,
    amount: bigint | TransactionArgument,
    inputCoin: TransactionArgument,
    isXtoY: boolean,
    transferToAddress?: string,
    limitSqrtPrice?: bigint,
    useMvr: boolean = true,
  ) {
    const result = this.swapV2({
      txb,
      pool,
      amount,
      inputCoin,
      isXtoY,
      transferToAddress,
      limitSqrtPrice,
      useMvr,
    });

    return result?.outputCoin;
  }

  /**
   * @params txb: Transaction
   * @params pool: PoolParams
   * @params amount: bigint | TransactionArgument
   * @params inputCoin: any
   * @params isXtoY: boolean
   * @params transferToAddress?: string
   * @params limitSqrtPrice?: bigint
   * @params useMvr?: boolean
   *
   * @returns: if transferToAddress is provided, all the coins will be transferred to the address
   * @returns: if transferToAddress is not provided, the outputCoin will be returned, and leftover of inputCoin will be returned
   * {
   *  outputCoin: TransactionObjectArgument;
   *  leftoverCoin: TransactionObjectArgument;
   * }
   */
  public swapV2({
    txb,
    pool,
    amount,
    inputCoin,
    isXtoY,
    transferToAddress,
    limitSqrtPrice,
    useMvr = true,
  }: {
    txb: Transaction;
    pool: PoolParams;
    amount: bigint | TransactionArgument;
    inputCoin: TransactionArgument;
    isXtoY: boolean;
    transferToAddress?: string;
    limitSqrtPrice?: bigint;
    useMvr?: boolean;
  }) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const LowLimitPrice = BigInt('4295048017');
    const HighLimitPrice = BigInt('79226673515401279992447579050');
    const poolObject = txb.object(pool.objectId);

    if (!limitSqrtPrice) {
      limitSqrtPrice = isXtoY ? LowLimitPrice : HighLimitPrice;
    }

    const [receive_a, receive_b, flash_receipt] = txb.moveCall({
      target: `${targetPackage}::trade::flash_swap`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        poolObject,
        txb.pure.bool(isXtoY),
        txb.pure.bool(true),
        typeof amount == 'bigint' ? txb.pure.u64(amount) : amount,
        txb.pure.u128(limitSqrtPrice),
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    txb.moveCall({
      target: `0x2::balance::destroy_zero`,
      arguments: [isXtoY ? receive_a : receive_b],
      typeArguments: [isXtoY ? pool.tokenXType : pool.tokenYType],
    });

    const [zeroCoin] = txb.moveCall({
      target: `0x2::coin::zero`,
      arguments: [],
      typeArguments: [isXtoY ? pool.tokenYType : pool.tokenXType],
    });

    const [coinADebt, coinBDebt] = txb.moveCall({
      target: `${targetPackage}::trade::swap_receipt_debts`,
      typeArguments: [],
      arguments: [flash_receipt],
    });

    const pay_coin_a = isXtoY
      ? txb.moveCall({
          target: `0x2::coin::split`,
          arguments: [inputCoin, coinADebt],
          typeArguments: [pool.tokenXType],
        })
      : zeroCoin;

    const pay_coin_b = isXtoY
      ? zeroCoin
      : txb.moveCall({
          target: `0x2::coin::split`,
          arguments: [inputCoin, coinBDebt],
          typeArguments: [pool.tokenYType],
        });

    const pay_coin_a_balance = txb.moveCall({
      target: `0x2::coin::into_balance`,
      typeArguments: [pool.tokenXType],
      arguments: [pay_coin_a],
    });

    const pay_coin_b_balance = txb.moveCall({
      target: `0x2::coin::into_balance`,
      typeArguments: [pool.tokenYType],
      arguments: [pay_coin_b],
    });

    txb.moveCall({
      target: `${targetPackage}::trade::repay_flash_swap`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        poolObject,
        flash_receipt,
        pay_coin_a_balance,
        pay_coin_b_balance,
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    txb.moveCall({
      target: `${this.sdk.contractConst.slippageCheckPackageId}::slippage_check::assert_slippage`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [poolObject, txb.pure.u128(limitSqrtPrice), txb.pure.bool(isXtoY)],
    });

    const outputCoin = txb.moveCall({
      target: `0x2::coin::from_balance`,
      typeArguments: [isXtoY ? pool.tokenYType : pool.tokenXType],
      arguments: [isXtoY ? receive_b : receive_a],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([inputCoin], txb.pure.address(transferToAddress));
      txb.transferObjects([outputCoin], txb.pure.address(transferToAddress));
    } else {
      return {
        outputCoin,
        leftoverCoin: inputCoin,
      };
    }
  }

  public flashSwap(
    txb: Transaction,
    pool: PoolParams,
    amountX: bigint,
    amountY: bigint,
    inputCoin: any,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const LowLimitPrice = 4295048016;
    const [receive_a, receive_b, flash_receipt] = txb.moveCall({
      target: `${targetPackage}::trade::flash_loan`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        txb.pure.u64(amountX),
        txb.pure.u64(amountY),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    txb.moveCall({
      target: `0x2::balance::destroy_zero`,
      arguments: [receive_a],
      typeArguments: [pool.tokenXType],
    });

    const zeroCoin = txb.moveCall({
      target: `0x2::balance::zero`,
      arguments: [],
      typeArguments: [pool.tokenYType],
    });

    const pay_coin_a = inputCoin;

    const pay_coin_b = zeroCoin;

    txb.moveCall({
      target: `${targetPackage}::trade::repay_flash_loan`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        flash_receipt,
        pay_coin_a,
        pay_coin_b,
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    const outputCoin = txb.moveCall({
      target: `0x2::coin::from_balance`,
      typeArguments: [],
      arguments: [receive_b],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([outputCoin], txb.pure.address(transferToAddress));
    } else {
      return outputCoin;
    }
  }

  public removeLiquidity(
    txb: Transaction,
    pool: PoolParams,
    positionId: string,
    liquidity: bigint | TransactionArgument,
    min_amount_x: bigint,
    min_amount_y: bigint,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [removeLpCoinA, removeLpCoinB] = txb.moveCall({
      target: `${targetPackage}::liquidity::remove_liquidity`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        txnArgument(positionId, txb),
        typeof liquidity === 'bigint' ? txb.pure.u128(liquidity) : liquidity,
        txb.pure.u64(min_amount_x),
        txb.pure.u64(min_amount_y),
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([removeLpCoinA, removeLpCoinB], txb.pure.address(transferToAddress));
    } else {
      return { removeLpCoinA, removeLpCoinB };
    }
  }

  public async addLiquidity(
    txb: Transaction,
    pool: PoolParams,
    position: string | TransactionArgument,
    coinX: string | TransactionArgument,
    coinY: string | TransactionArgument,
    min_amount_x: bigint,
    min_amount_y: bigint,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [coinA, coinB] = txb.moveCall({
      target: `${targetPackage}::liquidity::add_liquidity`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        // txb.object("0x06b1701f4a188877281b43b26cc3f96e9d0f9a0cd3aac8d06c914f1ebaa5846a"),
        txnArgument(position, txb),
        txnArgument(coinX, txb),
        txnArgument(coinY, txb),
        txb.pure.u64(min_amount_x),
        txb.pure.u64(min_amount_y),
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects(
        [coinA, coinB] as TransactionObjectArgument[],
        txb.pure.address(transferToAddress),
      );
    } else {
      return { coinA, coinB };
    }

    // const devInspectResult = await this.sdk.rpcClient.devInspectTransaction({
    //     Transaction: txb,
    //     sender: "0xeae88ca35ce291f0a1c807451e0d9712e7c61758a8f1fbf1dd23d9646b275847",
    // });
    // console.log(32242, devInspectResult);
  }

  public async addLiquiditySingleSided(
    txb: Transaction,
    pool: PoolParams,
    position: string | TransactionArgument,
    inputCoin: TransactionObjectArgument,
    min_amount_x: bigint,
    min_amount_y: bigint,
    isXtoY: boolean,
    transferToAddress?: string,
    limitSqrtPrice?: bigint,
    useMvr: boolean = true,
  ) {
    return this.addLiquiditySingleSidedV2({
      txb,
      pool,
      position,
      inputCoin,
      isXtoY,
      transferToAddress,
      limitSqrtPrice,
      slippagePercentage: 100, // min_amount_x and min_amount_y are BigInt(0) before, equals to 100% slippage
      useMvr,
    });
  }

  public async simulateSwapResultBeforeAddLiquiditySingleSided({
    pool,
    inputAmountInBaseUnits,
    isXtoY,
    limitSqrtPrice,
    position,
    txb,
    useMvr,
  }: {
    txb: Transaction;
    pool: PoolParams & { tokenXDecimals: number; tokenYDecimals: number };
    inputAmountInBaseUnits: bigint; // amount * 10^decimals
    isXtoY: boolean;
    limitSqrtPrice: bigint;
    position: string | TransactionArgument;
    useMvr: boolean;
  }) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);
    const inputCoinDecimals = isXtoY ? pool.tokenXDecimals : pool.tokenYDecimals;
    const outputCoinDecimals = isXtoY ? pool.tokenYDecimals : pool.tokenXDecimals;

    txb.moveCall({
      target: `${targetPackage}::trade::get_optimal_swap_amount_for_single_sided_liquidity`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        txb.pure.u64(inputAmountInBaseUnits),
        txnArgument(position, txb),
        txb.pure.u128(limitSqrtPrice),
        txb.pure.bool(isXtoY),
        txb.pure.u64(20),
      ],
    });

    try {
      const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      });
      const swapAmountInBaseUnits = this._decodeReturnU64Value(
        devInspectResult.results[devInspectResult.results.length - 1]?.returnValues?.[0]?.[0],
      );
      const outputAmountInBaseUnits = await this.preSwap(
        new Transaction(),
        [
          {
            tokenXType: pool.tokenXType,
            tokenYType: pool.tokenYType,
            poolId: pool.objectId,
            isXtoY,
          },
        ],
        swapAmountInBaseUnits,
      );

      const leftDepositAmount = this._formatAmountWithDecimals(
        (inputAmountInBaseUnits - BigInt(swapAmountInBaseUnits)).toString(),
        inputCoinDecimals,
      );

      const outputAmount = this._formatAmountWithDecimals(
        outputAmountInBaseUnits.toString(),
        outputCoinDecimals,
      );

      const swappedPercent = Decimal.div(
        Decimal(swapAmountInBaseUnits),
        Decimal(inputAmountInBaseUnits.toString()),
      )
        .mul(100)
        .toNumber()
        .toFixed(2);

      const leftPercent = (100 - Number(swappedPercent)).toFixed(2);

      return {
        tokenXAmount: isXtoY ? leftDepositAmount : outputAmount,
        tokenYAmount: isXtoY ? outputAmount : leftDepositAmount,
        tokenXPercent: isXtoY ? leftPercent : swappedPercent,
        tokenYPercent: isXtoY ? swappedPercent : leftPercent,
      };
    } catch (e) {
      console.log('sdk::simulateSwapResultBeforeAddLiquiditySingleSided error::', e);
      return null;
    }
  }

  /**
   * @param txb - Transaction builder
   * @param amount - Amount of coin to calculate slippage for
   * @param slippagePercentage - Slippage percentage (1 = 1%, 0.01 = 0.01%)
   * @description min_amount = amount * (1 - slippagePercentage / 100)
   */
  private _calcMinAmountUsingSlippage(
    txb: Transaction,
    amount: TransactionArgument,
    slippagePercentage: number, // 1 = 1%, 0.01 = 0.01%
  ) {
    // scale to 10000 base to avoid precision loss?
    const realSlippage = txb.pure.u64(10000 - slippagePercentage * 100);
    return txb.moveCall({
      target: `${this.sdk.PackageId}::full_math_u64::mul_div_ceil`,
      arguments: [amount, realSlippage, txb.pure.u64(10000)],
    });
  }

  /**
   * @description Add liquidity with single sided token
   * @param txb - Transaction builder
   * @param pool - Pool parameters
   * @param position - Position ID
   * @param inputCoin - Input coin, the single sided token
   * @param isXtoY - Whether the input coin is X or Y
   * @param transferToAddress - Address to transfer the output coin to
   * @param limitSqrtPrice - Limit sqrt price, it's calculated by swap slippage
   * @param slippagePercentage - Slippage percentage (1 = 1%, 0.01 = 0.01%)
   */
  public async addLiquiditySingleSidedV2({
    txb,
    pool,
    position,
    inputCoin,
    isXtoY,
    transferToAddress,
    limitSqrtPrice,
    slippagePercentage,
    useMvr = true,
  }: {
    txb: Transaction;
    pool: PoolParams;
    position: string | TransactionArgument;
    inputCoin: TransactionObjectArgument;
    isXtoY: boolean;
    transferToAddress: string;
    limitSqrtPrice?: bigint;
    slippagePercentage: number; // 1 = 1%
    useMvr?: boolean;
  }) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);
    const LowLimitPrice = BigInt('4295048017');
    const HighLimitPrice = BigInt('79226673515401279992447579050');
    const depositCoinType = isXtoY ? pool.tokenXType : pool.tokenYType;
    const swappedCoinType = isXtoY ? pool.tokenYType : pool.tokenXType;
    if (!limitSqrtPrice) {
      limitSqrtPrice = isXtoY ? LowLimitPrice : HighLimitPrice;
    }

    const depositAmount = txb.moveCall({
      target: '0x2::coin::value',
      arguments: [inputCoin],
      typeArguments: [depositCoinType],
    });

    const [swapAmount] = txb.moveCall({
      target: `${targetPackage}::trade::get_optimal_swap_amount_for_single_sided_liquidity`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        depositAmount,
        txnArgument(position, txb),
        txb.pure.u128(limitSqrtPrice),
        txb.pure.bool(isXtoY),
        txb.pure.u64(20),
      ],
    });

    const [swapCoin] = txb.splitCoins(inputCoin, [swapAmount]);

    const outputCoin = this.swap(txb, pool, swapAmount, swapCoin, isXtoY, null, limitSqrtPrice);

    const outputCoinAmount = txb.moveCall({
      target: '0x2::coin::value',
      arguments: [outputCoin],
      typeArguments: [swappedCoinType],
    });

    const leftDepositAmount = txb.moveCall({
      target: '0x2::coin::value',
      arguments: [inputCoin],
      typeArguments: [depositCoinType],
    });

    let min_amount_x = this._calcMinAmountUsingSlippage(txb, leftDepositAmount, slippagePercentage);
    let min_amount_y = this._calcMinAmountUsingSlippage(txb, outputCoinAmount, slippagePercentage);

    if (!isXtoY) {
      [min_amount_x, min_amount_y] = [min_amount_y, min_amount_x];
    }

    const [coinAOut, coinBOut] = txb.moveCall({
      target: `${targetPackage}::liquidity::add_liquidity`,
      typeArguments: [pool.tokenXType, pool.tokenYType],
      arguments: [
        txb.object(pool.objectId),
        // txb.object("0x06b1701f4a188877281b43b26cc3f96e9d0f9a0cd3aac8d06c914f1ebaa5846a"),
        txnArgument(position, txb),
        isXtoY ? inputCoin : outputCoin,
        isXtoY ? outputCoin : inputCoin,
        min_amount_x,
        min_amount_y,
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([coinAOut, coinBOut, swapCoin], txb.pure.address(transferToAddress));
    }
  }

  private _formatReturnU64ValueToAmount(bytes: number[], decimals: number) {
    const rawAmountStr = this._decodeReturnU64Value(bytes).toString();
    return this._formatAmountWithDecimals(rawAmountStr, decimals);
  }

  private _formatAmountWithDecimals(amount: string, decimals: number) {
    return new Decimal(amount).div(new Decimal(10).pow(decimals)).toString();
  }

  private _decodeReturnU64Value(bytes: number[]) {
    return bcs.u64().parse(new Uint8Array(bytes));
  }

  public collectFee(
    txb: Transaction,
    pool: PoolParams,
    positionId: string | TransactionArgument,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [feeCoinA, feeCoinB] = txb.moveCall({
      target: `${targetPackage}::collect::fee`,
      arguments: [
        txb.object(pool.objectId),
        txnArgument(positionId, txb),
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
      typeArguments: [pool.tokenXType, pool.tokenYType],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([feeCoinA, feeCoinB], txb.pure.address(transferToAddress));
    } else {
      return { feeCoinA, feeCoinB };
    }
  }

  public collectReward(
    txb: Transaction,
    pool: PoolParams,
    positionId: string | TransactionArgument,
    rewardCoinType: string,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [rewardCoin] = txb.moveCall({
      target: `${targetPackage}::collect::reward`,
      arguments: [
        txb.object(pool.objectId),
        txnArgument(positionId, txb),
        txb.object(normalizeSuiObjectId('0x6')),
        txb.object(this.sdk.contractConst.versionId),
      ],
      typeArguments: [pool.tokenXType, pool.tokenYType, rewardCoinType],
    });

    if (Boolean(transferToAddress)) {
      txb.transferObjects([rewardCoin], txb.pure.address(transferToAddress));
    } else {
      return rewardCoin;
    }
  }

  public collectAllRewards(
    txb: Transaction,
    pool: PoolParams,
    rewarders: Rewarder[],
    positionId: string | TransactionArgument,
    transferToAddress?: string,
  ) {
    const rewardCoins = [];
    rewarders.map((item) => {
      const rewardCoinType = item.coin_type;
      const rewardCoin = this.collectReward(txb, pool, positionId, rewardCoinType);
      rewardCoins.push(rewardCoin);
    });
    if (Boolean(transferToAddress)) {
      txb.transferObjects(rewardCoins, txb.pure.address(transferToAddress));
    } else {
      return rewardCoins;
    }
  }

  private async _getUserAllPositionObjects(address: string) {
    if (!address) {
      throw new Error('address is required');
    }

    const objects = await fetchUserObjectsByPkg(
      this.sdk.rpcClient,
      this.sdk.contractConst.publishedAt,
      address,
    );

    return objects.filter(
      (obj: any) => obj.type === `${this.sdk.contractConst.publishedAt}::position::Position`,
    );
  }

  public async collectAllPoolsRewards(userAddress: string, pools: ExtendedPool[]) {
    const positions = await this._getUserAllPositionObjects(userAddress);
    return this.fetchRewardsAndFee(positions, pools, userAddress);
  }

  public async fetchRewardsAndFee(positions: any, pools: ExtendedPool[], address: string) {
    const txb = new Transaction();
    const targetPackage = applyMvrPackage(txb, this.sdk, true);

    positions.map((position: any) => {
      const positionData = position.fields;
      const pos_id = positionData.id.id;
      const pool_id = positionData.pool_id;
      const pool = pools.find((pool) => pool.poolId === pool_id);
      const rewarders = pool.rewarders;

      const rewardCoins = [];
      if (rewarders?.length > 0) {
        rewarders.map((item) => {
          const rewardCoin = txb.moveCall({
            target: `${targetPackage}::collect::reward`,
            arguments: [
              txb.object(pool_id),
              txnArgument(pos_id, txb),
              txb.object(normalizeSuiObjectId('0x6')),
              txb.object(this.sdk.contractConst.versionId),
            ],
            typeArguments: [pool.tokenXType, pool.tokenYType, item.coin_type],
          });
          rewardCoins.push(rewardCoin);
        });
        txb.transferObjects(rewardCoins, txb.pure.address(address));
      }
      const [feeCoinA, feeCoinB] = txb.moveCall({
        target: `${targetPackage}::collect::fee`,
        arguments: [
          txb.object(pool_id),
          txnArgument(pos_id, txb),
          txb.object(normalizeSuiObjectId('0x6')),
          txb.object(this.sdk.contractConst.versionId),
        ],
        typeArguments: [pool.tokenXType, pool.tokenYType],
      });
      txb.transferObjects([feeCoinA, feeCoinB], txb.pure.address(address));
    });
    return txb;
  }

  public async migratevSuiPosition(
    vSuiPositionId: string,
    range: number,
    txb: Transaction,
    transferToAddress: string,
    useMvr: boolean = true,
  ) {
    try {
      const oldPoolId = '0x22e7b3c2d6671d208efb36a32a0a72528e60f9dd33fc71df07ea0ae3df011144';
      const newPoolId = '0xf1b6a7534027b83e9093bec35d66224daa75ea221d555c79b499f88c93ea58a9';
      const typeA =
        '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT';
      const typeB = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

      const positionTypes = [typeA, typeB];
      const oldPoolParams = {
        objectId: oldPoolId,
        tokenXType: typeA,
        tokenYType: typeB,
      } as PoolParams;

      const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

      var { feeCoinA, feeCoinB } = this.collectFee(txb, oldPoolParams, vSuiPositionId);
      var vSuiRewardCoin = this.collectReward(txb, oldPoolParams, vSuiPositionId, typeA);

      const oldLiquidity = txb.moveCall({
        target: `${targetPackage}::position::liquidity`,
        arguments: [txnArgument(vSuiPositionId, txb)],
      });
      let { removeLpCoinA, removeLpCoinB } = this.removeLiquidity(
        txb,
        oldPoolParams,
        vSuiPositionId,
        oldLiquidity,
        BigInt(0),
        BigInt(0),
      );

      txb.mergeCoins(removeLpCoinA, [feeCoinA, vSuiRewardCoin]);
      txb.mergeCoins(removeLpCoinB, [feeCoinB]);

      const mmtV3PoolId = newPoolId;
      const CetusPoolId = '0x6c545e78638c8c1db7a48b282bb8ca79da107993fcb185f75cedc1f5adb2f535';
      let isV3Reverse = false;
      let isCetusSwap = true;
      let isCetusReverse = false;
      let mmtV3Pool = {
        token_x_type: isV3Reverse ? positionTypes[1] : positionTypes[0],
        token_y_type: isV3Reverse ? positionTypes[0] : positionTypes[1],
      };
      let { tokenXSwap, tokenYSwap } = isCetusSwap
        ? {
            tokenXSwap: isCetusReverse ? positionTypes[1] : positionTypes[0],
            tokenYSwap: isCetusReverse ? positionTypes[0] : positionTypes[1],
          }
        : {
            tokenXSwap: mmtV3Pool.token_x_type,
            tokenYSwap: mmtV3Pool.token_y_type,
          };

      let upperRange = 1 * (1 + range / 100);
      let lowerRange = 1 * (1 - range / 100);
      let upperScalling = TickMath.priceToSqrtPriceX64(new Decimal(upperRange), 9, 9);
      let lowerScalling = TickMath.priceToSqrtPriceX64(new Decimal(lowerRange), 9, 9);
      let [upperSqrtPrice, lowerSqrtPrice] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::utils::get_position_bounds`,
        typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
        arguments: [
          txb.object(newPoolId),
          txb.pure.u128(BigInt(lowerScalling.toString())),
          txb.pure.u128(BigInt(upperScalling.toString())),
        ],
      });

      const [refundCoinA, refundCoinB, swapCoinA, swapCoinB, swapAmt, pos] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::migrate::fix_add_lp_residual_vsui`,
        typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
        arguments: [
          lowerSqrtPrice,
          upperSqrtPrice,
          removeLpCoinA,
          removeLpCoinB,
          txb.object(newPoolId),
          txb.object(CetusPoolId),
          txb.object(normalizeSuiObjectId('0x6')),
          txb.object(this.sdk.contractConst.versionId),
        ],
      });

      let { resCoinA, resCoinB } = handleMmtCetusSwap(
        swapCoinA,
        swapCoinB,
        swapAmt,
        tokenXSwap,
        tokenYSwap,
        isCetusReverse,
        isCetusSwap,
        isV3Reverse,
        CetusPoolId,
        mmtV3PoolId,
        txb,
      );

      const [refundCoinA1, refundCoinB1] = txb.moveCall({
        target: `${ModuleConstants.migrationPackageId}::migrate::add_final_lp`,
        typeArguments: [mmtV3Pool.token_x_type, mmtV3Pool.token_y_type],
        arguments: [
          resCoinA,
          resCoinB,
          txb.object(newPoolId),
          pos,
          txb.object(normalizeSuiObjectId('0x6')),
          txb.object(this.sdk.contractConst.versionId),
        ],
      });

      txb.mergeCoins(refundCoinA, [refundCoinA1]);
      txb.mergeCoins(refundCoinB, [refundCoinB1]);

      txb.transferObjects([refundCoinA], txb.pure.address(transferToAddress));
      txb.transferObjects([refundCoinB], txb.pure.address(transferToAddress));
      txb.transferObjects([pos], txb.pure.address(transferToAddress));
    } catch (error) {
      console.error(error);
    }
  }

  public async getAllPools(
    headers?: HeadersInit,
    validate: boolean = true,
  ): Promise<ExtendedPoolWithApr[]> {
    const pools = await fetchAllPoolsApi(this.sdk.baseUrl, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    if (validate) {
      await this.validatePoolsId(pools.map((pool) => pool.poolId));
    }
    return pools;
  }

  public async getPool(
    poolId: string,
    headers?: HeadersInit,
    validate: boolean = true,
  ): Promise<ExtendedPoolWithApr> {
    const pool = await fetchPoolApi(this.sdk.baseUrl, poolId, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    if (validate) {
      await this.validatePoolsId([pool.poolId]);
    }
    return pool;
  }

  private async validatePoolsId(poolIds: string[]) {
    const BATCH_SIZE = 20;

    for (let i = 0; i < poolIds.length; i += BATCH_SIZE) {
      const batch = poolIds.slice(i, i + BATCH_SIZE);

      const resp: SuiObjectResponse[] = await this.sdk.rpcClient.multiGetObjects({
        ids: batch,
        options: { showType: true },
      });

      if (!resp || resp.length === 0) {
        throw new Error(`Cannot get pools objects [${batch}]`);
      }

      for (const poolData of resp) {
        const poolType = poolData?.data?.type;
        if (!poolType) {
          throw new Error(`Cannot get pool object [${batch}]`);
        }
        const { address, module, name } = parseStructTag(poolType);
        if (
          address !== this.sdk.contractConst.publishedAt ||
          module !== 'pool' ||
          name !== 'Pool'
        ) {
          throw new Error(
            `Invalid pool type: expect: {${this.sdk.contractConst.publishedAt}::pool::Pool}, got: {${address} :: ${module} :: ${name}}`,
          );
        }
      }
    }
  }

  private async calcRewardApr(pool: ExtendedPool, tokens: TokenSchema[]) {
    const aprInfo = await this.getRewardsAPY(pool, tokens);
    const totalApr = aprInfo.rewarderApr.reduce((res, rewarder) => {
      return res.add(new Decimal(rewarder.rewarderApr));
    }, aprInfo.feeAPR);
    return {
      total: String(totalApr),
      fee: String(aprInfo.feeAPR),
      rewards: aprInfo.rewarderApr.map((reward) => ({
        coinType: reward.coinType,
        apr: String(reward.rewarderApr),
        amountPerDay: reward.amountPerDay,
      })),
    };
  }

  public async getAllTokens(headers?: HeadersInit) {
    const tokens = await fetchAllTokenApi(this.sdk.baseUrl, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    return tokens;
  }

  public async getToken(tokenId: string, headers?: HeadersInit) {
    const token = await fetchTokenApi(this.sdk.baseUrl, tokenId, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    return token;
  }

  public async fetchAllTickLiquidities(
    poolId: string,
    reverse: boolean = false,
    headers?: HeadersInit,
  ) {
    let offset = 0;
    const limit = 1000; // maximum limit
    let hasNextPage = true;
    let allTickLiquidities: TickLiquidity[] = [];

    while (hasNextPage) {
      const response = await fetchTickLiquidityApi(this.sdk.BaseUrl, poolId, limit, offset, {
        ...this.sdk.customHeaders,
        ...headers,
      });
      const tickData: TickLiquidity[] = response.data?.tickData || [];
      if (reverse && tickData.length > 0) {
        tickData.map((tickLiquidity) => {
          tickLiquidity.tickIndex = -tickLiquidity.tickIndex;
        });
      }
      allTickLiquidities = [...allTickLiquidities, ...tickData];
      hasNextPage = response.data.hasNextPage;
      offset += limit;
    }

    return allTickLiquidities;
  }

  public async fetchTickLiquidity(
    poolId: string,
    offset: number,
    limit: number,
    reverse: boolean = false,
    headers?: HeadersInit,
  ) {
    const response = await fetchTickLiquidityApi(this.sdk.BaseUrl, poolId, limit, offset, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    const tickData: TickLiquidity[] = response.data?.tickData || [];
    if (reverse && tickData.length > 0) {
      tickData.map((tickLiquidity) => {
        tickLiquidity.tickIndex = -tickLiquidity.tickIndex;
      });
    }
    response.data.tickData = tickData;
    return response;
  }

  public async getRewardersApy(poolId: string, headers?: HeadersInit) {
    const rewarders = await fetchRewardersApy(this.sdk.baseUrl, poolId, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    return rewarders;
  }

  public estPositionAPRWithDeltaMethod(
    currentTickIndex: number,
    lowerTickIndex: number,
    upperTickIndex: number,
    currentSqrtPriceX64: BN,
    poolLiquidity: BN,
    decimalsA: number,
    decimalsB: number,
    feeRate: number,
    amountAStr: string,
    amountBStr: string,
    swapVolumeStr: string,
    coinAPriceStr: string,
    coinBPriceStr: string,
    poolRewarders: any[],
  ) {
    const rewarderApr = [];
    const amountA = new Decimal(amountAStr);
    const amountB = new Decimal(amountBStr);
    const swapVolume = new Decimal(swapVolumeStr);
    const coinAPrice = new Decimal(coinAPriceStr);
    const coinBPrice = new Decimal(coinBPriceStr);
    const lowerSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(lowerTickIndex);
    const upperSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(upperTickIndex);
    const lowerSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(lowerSqrtPriceX64)).round();
    const upperSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(upperSqrtPriceX64)).round();
    const currentSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(currentSqrtPriceX64)).round();
    let deltaLiquidity;
    const { liquidityAmount0, liquidityAmount1 } = this.calcLiquidityAmounts(
      amountA,
      amountB,
      decimalsA,
      decimalsB,
      lowerSqrtPriceD,
      upperSqrtPriceD,
    );

    if (currentTickIndex < lowerTickIndex) {
      deltaLiquidity = liquidityAmount0;
    } else if (currentTickIndex > upperTickIndex) {
      deltaLiquidity = liquidityAmount1;
    } else {
      deltaLiquidity = Decimal.min(liquidityAmount0, liquidityAmount1);
    }

    const posValidTVL = this.getPosValidTVL(
      deltaLiquidity,
      currentSqrtPriceD,
      lowerSqrtPriceD,
      upperSqrtPriceD,
      decimalsA,
      decimalsB,
      coinAPrice,
      coinBPrice,
    );

    const feeAPR = deltaLiquidity.eq(new Decimal(0))
      ? new Decimal(0)
      : new Decimal(feeRate)
          .mul(swapVolume)
          .mul(
            new Decimal(deltaLiquidity.toString()).div(
              new Decimal(poolLiquidity.toString()).add(new Decimal(deltaLiquidity.toString())),
            ),
          )
          .div(posValidTVL)
          .mul(new Decimal(365));

    poolRewarders?.map((item) => {
      if (item.hasEnded) return;
      const rewarderDecimals = item.rewardsDecimal;
      const amountPerDay = new Decimal(item.flowRate)
        .div(new Decimal('18446744073709551616'))
        .mul(86400)
        .div(new Decimal(10 ** rewarderDecimals));
      const posRewarderPrice = new Decimal(item.rewardsPrice);
      const posRewarderAPR = amountPerDay
        .mul(posRewarderPrice)
        .mul(
          new Decimal(deltaLiquidity.toString()).div(
            new Decimal(poolLiquidity.toString()).add(new Decimal(deltaLiquidity.toString())),
          ),
        )
        .div(posValidTVL)
        .mul(new Decimal(36500));

      rewarderApr.push({
        rewarderApr: posRewarderAPR,
        coinType: item.coinType,
        amountPerDay,
      });
    });
    return {
      feeAPR,
      rewarderApr,
    };
  }

  public estPositionAPRWithLiquidityHM(
    currentTickIndex: number,
    lowerTickIndex: number,
    upperTickIndex: number,
    currentSqrtPriceX64: BN,
    poolLiquidity: BN,
    poolLiquidityHM: BN,
    decimalsA: number,
    decimalsB: number,
    feeRate: number,
    amountAStr: string,
    amountBStr: string,
    swapVolumeStr: string,
    coinAPriceStr: string,
    coinBPriceStr: string,
    poolRewarders: any[],
  ) {
    if (poolLiquidityHM.eq(new BN(0))) {
      return this.estPositionAPRWithDeltaMethod(
        currentTickIndex,
        lowerTickIndex,
        upperTickIndex,
        currentSqrtPriceX64,
        poolLiquidity,
        decimalsA,
        decimalsB,
        feeRate,
        amountAStr,
        amountBStr,
        swapVolumeStr,
        coinAPriceStr,
        coinBPriceStr,
        poolRewarders,
      );
    }
    const rewarderApr = [];
    const amountA = new Decimal(amountAStr);
    const amountB = new Decimal(amountBStr);
    const swapVolume = new Decimal(swapVolumeStr);
    const coinAPrice = new Decimal(coinAPriceStr);
    const coinBPrice = new Decimal(coinBPriceStr);
    const lowerSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(lowerTickIndex);
    const upperSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(upperTickIndex);
    const lowerSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(lowerSqrtPriceX64)).round();
    const upperSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(upperSqrtPriceX64)).round();
    const currentSqrtPriceD = MathUtil.toX64_Decimal(MathUtil.fromX64(currentSqrtPriceX64)).round();
    let deltaLiquidity;
    const { liquidityAmount0, liquidityAmount1 } = this.calcLiquidityAmounts(
      amountA,
      amountB,
      decimalsA,
      decimalsB,
      lowerSqrtPriceD,
      upperSqrtPriceD,
    );

    if (currentTickIndex < lowerTickIndex) {
      deltaLiquidity = liquidityAmount0;
    } else if (currentTickIndex > upperTickIndex) {
      deltaLiquidity = liquidityAmount1;
    } else {
      deltaLiquidity = Decimal.min(liquidityAmount0, liquidityAmount1);
    }

    const posValidTVL = this.getPosValidTVL(
      deltaLiquidity,
      currentSqrtPriceD,
      lowerSqrtPriceD,
      upperSqrtPriceD,
      decimalsA,
      decimalsB,
      coinAPrice,
      coinBPrice,
    );

    const feeAPR = deltaLiquidity.eq(new Decimal(0))
      ? new Decimal(0)
      : new Decimal(feeRate)
          .mul(swapVolume)
          .mul(new Decimal(deltaLiquidity.toString()).div(new Decimal(poolLiquidityHM.toString())))
          .div(posValidTVL)
          .mul(new Decimal(365));

    poolRewarders?.map((item) => {
      if (item.hasEnded) return;
      const rewarderDecimals = item.rewardsDecimal;
      const amountPerDay = new Decimal(item.flowRate)
        .div(new Decimal('18446744073709551616'))
        .mul(86400)
        .div(new Decimal(10 ** rewarderDecimals));
      const posRewarderPrice = new Decimal(item.rewardsPrice);
      const posRewarderAPR = amountPerDay
        .mul(posRewarderPrice)
        .mul(new Decimal(deltaLiquidity.toString()).div(new Decimal(poolLiquidityHM.toString())))
        .div(posValidTVL)
        .mul(new Decimal(36500));

      rewarderApr.push({
        rewarderApr: posRewarderAPR,
        coinType: item.coinType,
        amountPerDay,
      });
    });
    return {
      feeAPR,
      rewarderApr,
    };
  }

  public calcLiquidityAmounts(
    amountA: Decimal,
    amountB: Decimal,
    decimalsA: number,
    decimalsB: number,
    lowerSqrtPriceD: Decimal,
    upperSqrtPriceD: Decimal,
  ) {
    const liquidityAmount0 = amountA
      .mul(new Decimal(10 ** decimalsA))
      .mul(upperSqrtPriceD.mul(lowerSqrtPriceD))
      .div(new Decimal(Q_64))
      .div(upperSqrtPriceD.sub(lowerSqrtPriceD))
      .round();
    const liquidityAmount1 = amountB
      .mul(new Decimal(10 ** decimalsB))
      .mul(new Decimal(Q_64))
      .div(upperSqrtPriceD.sub(lowerSqrtPriceD))
      .round();
    return { liquidityAmount0, liquidityAmount1 };
  }

  public getPosValidTVL(
    deltaLiquidity: Decimal,
    currentSqrtPriceD: Decimal,
    lowerSqrtPriceD: Decimal,
    upperSqrtPriceD: Decimal,
    decimalsA: number,
    decimalsB: number,
    coinAPrice: Decimal,
    coinBPrice: Decimal,
  ) {
    const deltaY = deltaLiquidity
      .mul(currentSqrtPriceD.sub(lowerSqrtPriceD))
      .div(new Decimal(Q_64));
    const deltaX = deltaLiquidity
      .mul(upperSqrtPriceD.sub(currentSqrtPriceD))
      .div(currentSqrtPriceD.mul(upperSqrtPriceD))
      .mul(new Decimal(Q_64));

    return deltaX
      .div(new Decimal(10 ** decimalsA))
      .mul(coinAPrice)
      .add(deltaY.div(new Decimal(10 ** decimalsB).mul(coinBPrice)));
  }

  public calculatePoolValidTVL(
    amountA: BN,
    amountB: BN,
    decimalsA: number,
    decimalsB: number,
    coinAPrice: Decimal,
    coinBPrice: Decimal,
  ): Decimal {
    const poolValidAmountA = new Decimal(amountA.toString()).div(new Decimal(10 ** decimalsA));
    const poolValidAmountB = new Decimal(amountB.toString()).div(new Decimal(10 ** decimalsB));

    const TVL = poolValidAmountA.mul(coinAPrice).add(poolValidAmountB.mul(coinBPrice));

    return TVL;
  }

  public async getRewardsAPY(pool: ExtendedPool, tokensInput?: TokenSchema[]) {
    try {
      if (pool.liquidity === '0') {
        return {
          feeAPR: '0',
          rewarderApr: [],
        };
      }
      const rewarders = pool?.rewarders;
      const tokens = tokensInput || (await this.getAllTokens());
      const tokenA = tokens.find((token) => token.coinType === pool?.tokenXType);
      const tokenB = tokens.find((token) => token.coinType === pool?.tokenYType);

      const rewardsArr = rewarders?.map((rewarder) => {
        const coinType = rewarder.coin_type;
        const token = tokens.find((token) => token.coinType === coinType);
        return {
          rewardsAmount: Number(rewarder.reward_amount),
          rewardsPrice: token?.price,
          rewardsDecimal: token?.decimals,
          coinType: coinType,
          hasEnded: rewarder.hasEnded,
          flowRate: rewarder.flow_rate,
        };
      });
      if (pool.isStable) {
        return this.getStablePoolAPR(pool, rewardsArr);
      }

      const lower_price =
        0.95 *
        TickMath.sqrtPriceX64ToPrice(
          new BN(pool?.currentSqrtPrice),
          tokenA?.decimals,
          tokenB?.decimals,
        ).toNumber();
      const upper_price =
        1.05 *
        TickMath.sqrtPriceX64ToPrice(
          new BN(pool?.currentSqrtPrice),
          tokenA?.decimals,
          tokenB?.decimals,
        ).toNumber();
      // console.log(Math.floor((0.9 * Number(pool?.liquidity))).toString(), pool?.current_sqrt_price, TickMath.priceToSqrtPriceX64(new Decimal(lower_price), tokenA?.decimals, tokenB?.decimals).toString(), TickMath.priceToSqrtPriceX64(new Decimal(upper_price), tokenA?.decimals, tokenB?.decimals).toString(),)
      const pool_lower_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacingUnsafe(
          new Decimal(lower_price),
          tokenA?.decimals,
          tokenB?.decimals,
          pool?.tickSpacing,
        ),
      );
      const pool_upper_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacingUnsafe(
          new Decimal(upper_price),
          tokenA?.decimals,
          tokenB?.decimals,
          pool?.tickSpacing,
        ),
      );

      const { coinAmountA, coinAmountB } = estLiquidityAndcoinAmountFromOneAmounts(
        pool_lower_tick_index,
        pool_upper_tick_index,
        new BN((10 ** tokenA.decimals).toString()),
        true,
        false,
        0.01,
        new BN(pool?.currentSqrtPrice),
      );
      const swapVolume = pool?.volume24h ?? '0';

      if (!tokenA || !tokenB) {
        throw new Error('Token not found');
      }

      const aprData = this.estPositionAPRWithLiquidityHM(
        convertI32ToSigned(Number(pool.currentTickIndex)),
        pool_lower_tick_index,
        pool_upper_tick_index,
        new BN(pool.currentSqrtPrice),
        new BN(pool.liquidity),
        new BN(pool.liquidityHM),
        tokenA?.decimals,
        tokenB?.decimals,
        Number(pool?.lpFeesPercent),
        (coinAmountA.toNumber() / 10 ** tokenA.decimals).toString(),
        (coinAmountB.toNumber() / 10 ** tokenB.decimals).toString(),
        swapVolume,
        tokenA?.price,
        tokenB?.price,
        rewardsArr ?? [],
      );

      return aprData;
    } catch (e) {
      console.error('Error getting rewards apy.');
      console.error(e);
      return {
        feeAPR: '0',
        rewarderApr: [],
      };
    }
  }

  public async preSwap(tx: Transaction, pools: PreSwapParam[], sourceAmount: any) {
    const targetPackage = applyMvrPackage(tx, this.sdk, true);

    let inputAmount = tx.pure.u64(sourceAmount.toString());

    const LowLimitPrice = BigInt('4295048017');
    const HighLimitPrice = BigInt('79226673515401279992447579050');

    for (const pool of pools) {
      const { tokenXType, tokenYType } = pool;
      const isXtoY = pool.isXtoY;

      const swapResult = tx.moveCall({
        target: `${targetPackage}::trade::compute_swap_result`,
        typeArguments: [tokenXType, tokenYType],
        arguments: [
          tx.object(pool.poolId),
          tx.pure.bool(isXtoY),
          tx.pure.bool(true),
          tx.pure.u128(isXtoY ? LowLimitPrice : HighLimitPrice),
          inputAmount,
        ],
      });

      inputAmount = tx.moveCall({
        target: `${targetPackage}::trade::get_state_amount_calculated`,
        arguments: [swapResult],
      });
    }

    const res = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: normalizeSuiAddress('0x0'),
      additionalArgs: { showRawTxnDataAndEffects: true },
    });

    if (res.error || res.effects?.status.status !== 'success') {
      console.info(`Dry run failed: ${res.error || 'Unknown failure'}`);
      return 0n;
    }

    const lastIndex = 2 * (pools.length - 1) + 1;
    const amountOut = res.results?.[lastIndex]?.returnValues?.[0]?.[0];

    if (!amountOut) {
      return 0n;
    }
    const amountOutParsed = bcs.u64().parse(new Uint8Array(amountOut));
    return BigInt(amountOutParsed);
  }

  private getStablePoolAPR(
    pool: ExtendedPool,
    rewardsArr: {
      rewardsAmount: number;
      rewardsPrice: string;
      rewardsDecimal: number;
      coinType: string;
      hasEnded: boolean;
      flowRate: number;
    }[],
  ) {
    const feeUSD24h = new Decimal(pool?.fees24h ?? 0);
    const tvlUSD = pool.tvl;

    const feeAPR = new Decimal(tvlUSD).eq(0)
      ? new Decimal(0)
      : feeUSD24h.mul(365).div(tvlUSD).mul(100);

    const rewarderApr = (rewardsArr ?? [])
      .map((item) => {
        if (item.hasEnded) return null;

        const amountPerDay = new Decimal(item.flowRate)
          .div(new Decimal('18446744073709551616'))
          .mul(86400)
          .div(new Decimal(10 ** item.rewardsDecimal));

        const rewardUSDPerDay = amountPerDay.mul(item.rewardsPrice ?? 0);

        const apr = new Decimal(tvlUSD).eq(0)
          ? new Decimal(0)
          : rewardUSDPerDay.mul(365).div(tvlUSD).mul(100);

        return {
          rewarderApr: apr,
          coinType: item.coinType,
          amountPerDay,
        };
      })
      .filter(Boolean);

    return {
      feeAPR,
      rewarderApr,
    };
  }

  public time = 0;

  private async _findRouteAndSwap({
    txb,
    inputCoinType,
    inputCoin,
    outputCoinType,
    slippage = 1,
    useMvr = true,
    toAddress,
    pools,
  }: {
    txb: Transaction;
    inputCoinType: string;
    inputCoin: TransactionObjectArgument;
    outputCoinType: string;
    slippage: number; // 1 = 1%
    toAddress: string;
    useMvr?: boolean;
    pools: ExtendedPoolWithApr[];
  }) {
    inputCoinType = formatCoinType(inputCoinType);
    outputCoinType = formatCoinType(outputCoinType);

    if (inputCoinType === outputCoinType) {
      return inputCoin;
    }

    const routes = CLAIM_ROUTES?.[outputCoinType]?.[inputCoinType];

    if (!routes || routes.length === 0) {
      throw new Error(`No swap route found from ${inputCoinType} to ${outputCoinType}`);
    }

    const allPools = pools || (await this.getAllPools());

    let currentCoin = inputCoin;
    let currentAmount = txb.moveCall({
      target: '0x2::coin::value',
      arguments: [currentCoin],
      typeArguments: [inputCoinType],
    });
    let currentCoinType = inputCoinType;

    for (let i = 0; i < routes.length; i++) {
      const poolId = routes[i];
      const swapPool = allPools.find((p) => p.poolId === poolId);

      if (!swapPool) {
        throw new Error(`Pool ${poolId} not found`);
      }

      const isXtoY = swapPool.tokenXType === currentCoinType;

      const poolParams: PoolParams = {
        objectId: poolId,
        tokenXType: swapPool.tokenXType,
        tokenYType: swapPool.tokenYType,
      };

      const limitSqrtPrice = await getLimitSqrtPriceUsingSlippage({
        client: this.sdk.rpcClient,
        poolId: swapPool.poolId,
        currentSqrtPrice: swapPool.currentSqrtPrice,
        tokenX: swapPool.tokenX,
        tokenY: swapPool.tokenY,
        slippagePercentage: slippage,
        isTokenX: isXtoY,
      });

      const { outputCoin, leftoverCoin } = this.swapV2({
        txb,
        pool: poolParams,
        amount: currentAmount,
        inputCoin: currentCoin,
        isXtoY,
        limitSqrtPrice,
        useMvr,
      });

      txb.transferObjects([leftoverCoin], txb.pure.address(toAddress));

      currentCoin = outputCoin;

      currentCoinType = isXtoY ? swapPool.tokenYType : swapPool.tokenXType;
      currentCoinType = formatCoinType(currentCoinType);

      if (currentCoinType === outputCoinType) {
        return currentCoin;
      }

      currentAmount = txb.moveCall({
        target: '0x2::coin::value',
        arguments: [currentCoin],
        typeArguments: [currentCoinType],
      });
    }

    return currentCoin;
  }

  /**
   * @description:
   * claim fee as a single coin
   *
   * @params txb: Transaction
   * @params pool: PoolParams
   * @params positionId: string | TransactionArgument
   * @params targetCoinType: string
   * @params slippage: number // 1 = 1%
   * @params toAddress: string
   * @params useMvr?: boolean
   * @returns:
   * if toAddress is provided, all the coins will be transferred to the address
   * if toAddress is not provided, the outputCoin will be returned, and leftover of inputCoin will be returned
   * {
   *  outputCoin: TransactionObjectArgument;
   *  leftoverCoin: TransactionObjectArgument;
   * }
   */
  public async claimFeeAs({
    txb,
    pool,
    positionId,
    targetCoinType,
    slippage = 1,
    useMvr = true,
    toAddress,
    pools,
  }: {
    txb: Transaction;
    pool: PoolParams;
    positionId: string | TransactionArgument;
    targetCoinType: string;
    slippage: number; // 1 = 1%
    toAddress: string;
    useMvr?: boolean;
    pools?: ExtendedPoolWithApr[];
  }) {
    const { feeCoinA, feeCoinB } = this.collectFee(txb, pool, positionId, undefined, useMvr);

    const outputCoinA = await this._findRouteAndSwap({
      txb,
      inputCoinType: pool.tokenXType,
      inputCoin: feeCoinA,
      outputCoinType: targetCoinType,
      slippage,
      useMvr,
      toAddress,
      pools,
    });

    const outputCoinB = await this._findRouteAndSwap({
      txb,
      inputCoinType: pool.tokenYType,
      inputCoin: feeCoinB,
      outputCoinType: targetCoinType,
      slippage,
      useMvr,
      toAddress,
      pools,
    });

    txb.mergeCoins(outputCoinA, [outputCoinB]);

    if (toAddress) {
      return txb.transferObjects([outputCoinA], txb.pure.address(toAddress));
    }

    return outputCoinA;
  }

  public async claimRewardsAs({
    txb,
    pool,
    positionId,
    rewarderCoinTypes,
    targetCoinType,
    slippage = 1,
    toAddress,
    useMvr = true,
    pools,
  }: {
    txb: Transaction;
    pool: PoolParams;
    positionId: string | TransactionArgument;
    rewarderCoinTypes: string[];
    targetCoinType: string;
    slippage: number;
    toAddress: string;
    useMvr?: boolean;
    pools?: ExtendedPoolWithApr[];
  }) {
    if (!rewarderCoinTypes || rewarderCoinTypes.length === 0) {
      return undefined;
    }

    const rewardCoins = new Map<string, TransactionObjectArgument[]>();

    rewarderCoinTypes.forEach((rewardCoinType) => {
      const rewardCoin = this.collectReward(
        txb,
        pool,
        positionId,
        rewardCoinType,
        undefined,
        useMvr,
      );

      if (rewardCoins.has(rewardCoinType)) {
        rewardCoins.get(rewardCoinType)?.push(rewardCoin);
      } else {
        rewardCoins.set(rewardCoinType, [rewardCoin]);
      }
    });

    const mergedRewardCoins = Array.from(rewardCoins.keys())
      .map((rewardCoinType) => {
        const coins = rewardCoins.get(rewardCoinType);

        if (!coins || coins.length === 0) {
          return undefined;
        }

        return {
          type: rewardCoinType,
          coin: mergeCoins(coins, txb),
        };
      })
      .filter(Boolean);

    let outputCoin: TransactionObjectArgument | undefined;

    for (const { type, coin } of mergedRewardCoins) {
      const currentCoin = await this._findRouteAndSwap({
        txb,
        inputCoinType: type,
        inputCoin: coin,
        outputCoinType: targetCoinType,
        slippage,
        toAddress,
        useMvr,
        pools,
      });

      if (!outputCoin) {
        outputCoin = currentCoin;
      } else {
        txb.mergeCoins(outputCoin, [currentCoin]);
      }
    }

    if (toAddress) {
      return txb.transferObjects([outputCoin], txb.pure.address(toAddress));
    }

    return outputCoin;
  }

  public async getMinTickRangeFactor(
    poolIds: string[],
    coinXTypes: string[],
    coinYTypes: string[],
    useMvr: boolean = true,
  ): Promise<Array<{ poolId: string; minTickRangeFactor: number }>> {
    if (poolIds.length === 0 || poolIds.length > 1024 || coinXTypes.length !== coinYTypes.length) {
      throw new Error(
        'Invalid input: poolIds must not be empty and must less than 1024 and coinXTypes must match coinYTypes',
      );
    }

    const tx = new Transaction();
    const targetPackage = applyMvrPackage(tx, this.sdk, useMvr);

    for (let i = 0; i < poolIds.length; i++) {
      tx.moveCall({
        target: `${targetPackage}::pool::min_tick_range_factor`,
        typeArguments: [coinXTypes[i], coinYTypes[i]],
        arguments: [tx.object(poolIds[i])],
      });
    }

    const res = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: normalizeSuiAddress('0x0'),
      additionalArgs: { showRawTxnDataAndEffects: true },
    });

    if (res.error || res.effects?.status.status !== 'success') {
      throw new Error(`Failed to get min tick range factors: ${res.error || 'Unknown failure'}`);
    }

    const results: Array<{ poolId: string; minTickRangeFactor: number }> = [];

    if (res.results && res.results.length > 0) {
      for (let i = 0; i < poolIds.length; i++) {
        const returnValue = res.results[i]?.returnValues?.[0]?.[0];
        if (!returnValue) {
          throw new Error(`No return value from min_tick_range_factor call for pool ${poolIds[i]}`);
        }

        const minTickRangeFactor = bcs.u32().parse(new Uint8Array(returnValue));
        results.push({
          poolId: poolIds[i],
          minTickRangeFactor: Number(minTickRangeFactor),
        });
      }
    }

    return results;
  }
}
