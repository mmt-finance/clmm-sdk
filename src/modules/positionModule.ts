import {
  TransactionArgument,
  Transaction,
  TransactionObjectArgument,
} from '@mysten/sui/transactions';
import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { bcs } from '@mysten/sui/bcs';
import { transformPositionRpcObject, txnArgument } from '../utils/common';
import { ExtendedPool, PoolParams, PositionStatus, RewardsData, TokenSchema } from '../types';
import { fetchUserObjectsByPkg, getCoinAmountFromLiquidity } from '../utils/poolUtils';
import { convertI32ToSigned, TickMath } from '../utils/math/tickMath';
import { BN } from 'bn.js';
import { getPositionStatus } from '../utils/positionUtils';
import { SuiClient } from '@mysten/sui/dist/cjs/client';
import { MathUtil } from '../utils/math/commonMath';
import { applyMvrPackage } from '../utils/mvr/utils';

export class PositionModule implements BaseModule {
  protected _sdk: MmtSDK;

  constructor(sdk: MmtSDK) {
    this._sdk = sdk;
  }

  get sdk() {
    return this._sdk;
  }

  public openPosition(
    txb: Transaction,
    pool: PoolParams,
    lower_tick_sqrt_price: string | TransactionArgument,
    upper_tick_sqrt_price: string | TransactionArgument,
    transferToAddress?: string,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [lowerTick1] = txb.moveCall({
      target: `${targetPackage}::tick_math::get_tick_at_sqrt_price`,
      arguments: [
        typeof lower_tick_sqrt_price === 'string'
          ? txb.pure.u128(BigInt(lower_tick_sqrt_price))
          : lower_tick_sqrt_price,
      ],
    });
    const [upperTick1] = txb.moveCall({
      target: `${targetPackage}::tick_math::get_tick_at_sqrt_price`,
      arguments: [
        typeof upper_tick_sqrt_price === 'string'
          ? txb.pure.u128(BigInt(upper_tick_sqrt_price))
          : upper_tick_sqrt_price,
      ],
    });
    const [tick_spacing] = txb.moveCall({
      target: `${targetPackage}::i32::from_u32`,
      arguments: [txb.pure.u32(pool.tickSpacing)],
    });

    const [lowerTickmod] = txb.moveCall({
      target: `${targetPackage}::i32::mod`,
      arguments: [lowerTick1, tick_spacing],
    });

    const [upperTickmod] = txb.moveCall({
      target: `${targetPackage}::i32::mod`,
      arguments: [upperTick1, tick_spacing],
    });

    const [upperTick] = txb.moveCall({
      target: `${targetPackage}::i32::sub`,
      arguments: [upperTick1, upperTickmod],
    });

    const [lowerTick] = txb.moveCall({
      target: `${targetPackage}::i32::sub`,
      arguments: [lowerTick1, lowerTickmod],
    });

    const [positionObj] = txb.moveCall({
      target: `${targetPackage}::liquidity::open_position`,
      arguments: [
        txb.object(pool.objectId),
        txnArgument(lowerTick, txb),
        txnArgument(upperTick, txb),
        txb.object(this.sdk.contractConst.versionId),
      ],
      typeArguments: [pool.tokenXType, pool.tokenYType],
    });
    if (Boolean(transferToAddress)) {
      txb.transferObjects([positionObj], txb.pure.address(transferToAddress));
    } else {
      return positionObj;
    }
  }

  public closePosition(
    txb: Transaction,
    positionId: string | TransactionArgument,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    txb.moveCall({
      target: `${targetPackage}::liquidity::close_position`,
      arguments: [txnArgument(positionId, txb), txb.object(this.sdk.contractConst.versionId)],
    });
  }

  public updateRewardInfos(
    txb: Transaction,
    positionId: string | TransactionArgument,
    reward_growth_inside: number[],
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    txb.moveCall({
      target: `${targetPackage}::position::update_reward_infos`,
      arguments: [
        txnArgument(positionId, txb),
        txb.makeMoveVec({
          type: 'u128',
          elements: reward_growth_inside.map((item) =>
            txb.pure.u128(item),
          ) as TransactionObjectArgument[],
        }),
      ],
    });
  }

  public borrowMutRewardInfoObject(
    txb: Transaction,
    positionId: string | TransactionArgument,
    reward_index: number,
    useMvr: boolean = true,
  ) {
    const targetPackage = applyMvrPackage(txb, this.sdk, useMvr);

    const [rewardinfoObj] = txb.moveCall({
      target: `${targetPackage}::position::try_borrow_mut_reward_info`,
      arguments: [txnArgument(positionId, txb), txb.pure.u64(reward_index)],
    });

    return rewardinfoObj;
  }

  public async fetchPositionRpc(positionId: string) {
    const res = await this.sdk.rpcClient.getObject({
      id: positionId,
      options: { showContent: true },
    });
    const fields = (res?.data?.content as { fields: any })?.fields!;
    const posRpcObj = transformPositionRpcObject(fields);

    return posRpcObj;
  }

  // ----------getter functions---------------

  public async getUserPositionsUsdValue(
    address: string,
    pools: ExtendedPool[],
    tokens: TokenSchema[],
  ) {
    const objects = await fetchUserObjectsByPkg(
      this.sdk.rpcClient,
      this.sdk.contractConst.publishedAt,
      address,
    );
    const positions = objects.filter(
      (obj: any) => obj.type === `${this.sdk.contractConst.publishedAt}::position::Position`,
    );
    const tokenPriceMap = new Map(tokens.map((token) => [token.coinType, Number(token.price)]));
    return positions
      .map((position: any) => {
        const positionData = position.fields;
        if (!positionData) return null;

        const pool = pools.find((p) => p.poolId === positionData.pool_id);
        if (!pool) return null;

        const liquidity = new BN(positionData.liquidity ?? 0);
        const upperBits = Number(positionData.tick_upper_index.fields.bits ?? 0);
        const lowerBits = Number(positionData.tick_lower_index.fields.bits ?? 0);
        const upperTick = MathUtil.u32ToI32(upperBits);
        const lowerTick = MathUtil.u32ToI32(lowerBits);

        const upperTickSqrtPrice = TickMath.tickIndexToSqrtPriceX64(convertI32ToSigned(upperTick));
        const lowerTickSqrtPrice = TickMath.tickIndexToSqrtPriceX64(convertI32ToSigned(lowerTick));

        const { coinA, coinB } = getCoinAmountFromLiquidity(
          liquidity,
          new BN(pool.currentSqrtPrice.toString()),
          lowerTickSqrtPrice,
          upperTickSqrtPrice,
          false,
        );

        const calculateUsdValue = (amount: number, coinType: string) =>
          (amount / 10 ** pool[coinType].decimals) * tokenPriceMap.get(pool[coinType].coinType);

        return {
          objectId: positionData.id.id,
          poolId: positionData.pool_id,
          amount:
            calculateUsdValue(Number(coinA), 'tokenX') + calculateUsdValue(Number(coinB), 'tokenY'),
        };
      })
      .filter(Boolean);
  }

  public async getAllUserPositions(address: string) {
    try {
      const [objects, pools, tokens] = await Promise.all([
        fetchUserObjectsByPkg(this.sdk.rpcClient, this.sdk.contractConst.publishedAt, address),
        this.sdk.Pool.getAllPools(),
        this.sdk.Pool.getAllTokens(),
      ]);
      const positions = objects.filter(
        (obj: any) => obj.type === `${this.sdk.contractConst.publishedAt}::position::Position`,
      );

      const positionRewardsInfo = await this.fetchRewards(
        positions,
        pools,
        address,
        this.sdk.rpcClient,
      );

      const tokenPriceMap = new Map(tokens.map((token) => [token.coinType, Number(token.price)]));

      return positions
        .map((position: any) => {
          const positionData = position.fields;
          if (!positionData) return null;

          const pool = pools.find((p) => p.poolId === positionData.pool_id);
          if (!pool) return null;
          const liquidity = new BN(positionData.liquidity ?? 0);
          const upperBits = Number(positionData.tick_upper_index.fields.bits ?? 0);
          const lowerBits = Number(positionData.tick_lower_index.fields.bits ?? 0);
          const upperTick = MathUtil.u32ToI32(upperBits);
          const lowerTick = MathUtil.u32ToI32(lowerBits);

          const upperTickSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            convertI32ToSigned(upperTick),
          );
          const lowerTickSqrtPrice = TickMath.tickIndexToSqrtPriceX64(
            convertI32ToSigned(lowerTick),
          );
          const lowerPrice = Number(
            TickMath.sqrtPriceX64ToPrice(
              lowerTickSqrtPrice,
              pool.tokenX.decimals,
              pool.tokenY.decimals,
            ),
          );
          const upperPrice = Number(
            TickMath.sqrtPriceX64ToPrice(
              upperTickSqrtPrice,
              pool.tokenX.decimals,
              pool.tokenY.decimals,
            ),
          );
          const { coinA, coinB } = getCoinAmountFromLiquidity(
            liquidity,
            new BN(pool.currentSqrtPrice.toString()),
            lowerTickSqrtPrice,
            upperTickSqrtPrice,
            false,
          );

          const calculateUsdValue = (amount: number, coinType: string) =>
            (amount / 10 ** pool[coinType].decimals) * tokenPriceMap.get(pool[coinType].coinType);

          const totalUsdValue =
            calculateUsdValue(Number(coinA), 'tokenX') + calculateUsdValue(Number(coinB), 'tokenY');

          const rewardsData = positionRewardsInfo[positionData.id.id];
          const feeUsdValue = rewardsData
            ? calculateUsdValue(rewardsData.feeCollected.amountX, 'tokenX') +
              calculateUsdValue(rewardsData.feeCollected.amountY, 'tokenY')
            : 0;

          const rewardsUsdValue = rewardsData
            ? rewardsData.rewards.reduce((total, reward) => {
                const coinType = reward.coinType.includes('0x2::sui::SUI')
                  ? '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
                  : reward.coinType;
                const token = tokens.find((t) => t.coinType === coinType);
                return total + (reward.amount / 10 ** token.decimals) * tokenPriceMap.get(coinType);
              }, 0)
            : 0;

          return {
            objectId: positionData.id.id,
            poolId: positionData.pool_id,
            upperPrice,
            lowerPrice,
            upperTick,
            lowerTick,
            liquidity: new BN(positionData.liquidity ?? 0),
            amount: totalUsdValue,
            status:
              PositionStatus[
                getPositionStatus(
                  Number(pool.currentSqrtPrice),
                  Number(lowerTickSqrtPrice),
                  Number(upperTickSqrtPrice),
                )
              ],
            claimableRewards: rewardsUsdValue + feeUsdValue,
            rewarders: rewardsData ? rewardsData.rewards : [],
            feeAmountXUsd: rewardsData
              ? calculateUsdValue(rewardsData.feeCollected.amountX, 'tokenX')
              : 0,
            feeAmountYUsd: rewardsData
              ? calculateUsdValue(rewardsData.feeCollected.amountY, 'tokenY')
              : 0,
            feeAmountX: rewardsData ? rewardsData.feeCollected.amountX : 0,
            feeAmountY: rewardsData ? rewardsData.feeCollected.amountY : 0,
          };
        })
        .filter(Boolean);
    } catch (e) {
      console.error('Error in getAllUserPositions:', e);
      throw e;
    }
  }

  public async fetchRewards(
    positions: any,
    pools: ExtendedPool[],
    address: string,
    client: SuiClient,
  ) {
    const allRewards: Record<string, RewardsData> = {};
    const batchSize = 100;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const txb = new Transaction();
      txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);

      for (const position of batch) {
        const positionData = position.fields;
        const pos_id = positionData.id.id;
        const pool_id = positionData.pool_id;
        const pool = pools.find((pool) => pool.poolId === pool_id);
        const poolModel: PoolParams = {
          objectId: pool_id,
          tokenXType: pool.tokenXType,
          tokenYType: pool.tokenYType,
        };
        const rewarders = pool.rewarders;

        if (rewarders?.length > 0) {
          this.sdk.Pool.collectAllRewards(txb, poolModel, rewarders, pos_id, address);
        }

        this.sdk.Pool.collectFee(txb, poolModel, pos_id, address);
      }

      const res = await client.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: address,
      });

      for (const event of res.events) {
        const { type, parsedJson } = event;
        if (type === `${this.sdk.contractConst.publishedAt}::collect::CollectPoolRewardEvent`) {
          const { reward_coin_type, amount, position_id } = parsedJson as any;
          if (allRewards[position_id]) {
            allRewards[position_id].rewards.push({
              coinType: `0x${reward_coin_type.name}`,
              amount: parseInt(amount),
            });
          } else {
            allRewards[position_id] = {
              rewards: [
                {
                  coinType: `0x${reward_coin_type.name}`,
                  amount: parseInt(amount),
                },
              ],
              feeCollected: {
                amountX: 0,
                amountY: 0,
              },
            };
          }
        } else if (type === `${this.sdk.contractConst.publishedAt}::collect::FeeCollectedEvent`) {
          const { amount_x, amount_y, position_id } = parsedJson as any;
          if (allRewards[position_id]) {
            allRewards[position_id].feeCollected = {
              amountX: parseInt(amount_x),
              amountY: parseInt(amount_y),
            };
          } else {
            allRewards[position_id] = {
              rewards: [],
              feeCollected: {
                amountX: parseInt(amount_x),
                amountY: parseInt(amount_y),
              },
            };
          }
        }
      }
    }
    return allRewards;
  }

  public async getCoinOwedReward(positionId: string | TransactionArgument, reward_index: number) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::coins_owed_reward`,
      arguments: [txnArgument(positionId, txb), txb.pure.u64(reward_index)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const rewardAmount = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return rewardAmount;
    } catch (e) {
      console.log(e);
    }
  }

  public async getOwedCoinX(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::owed_coin_x`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const owedCoinX = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return owedCoinX;
    } catch (e) {
      console.log(e);
    }
  }

  public async getOwedCoinY(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::owed_coin_y`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const owedCoiny = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return owedCoiny;
    } catch (e) {
      console.log(e);
    }
  }

  public async getFeeGrowthInsideXLast(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::fee_growth_inside_x_last`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const feeGrowthValue = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return feeGrowthValue;
    } catch (e) {
      console.log(e);
    }
  }

  public async getFeeGrowthInsideYLast(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::fee_growth_inside_y_last`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const feeGrowthValue = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return feeGrowthValue;
    } catch (e) {
      console.log(e);
    }
  }

  public async getFeeRate(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::fee_rate`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const feeRate = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return feeRate;
    } catch (e) {
      console.log(e);
    }
  }

  public async getLiquidity(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::liquidity`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const liquidity = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return liquidity;
    } catch (e) {
      console.log(e);
    }
  }

  public async getRewardGrowthInsideLast(
    positionId: string | TransactionArgument,
    reward_index: number,
  ) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::reward_growth_inside_last`,
      arguments: [txnArgument(positionId, txb), txb.pure.u64(reward_index)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const rewardGrowthValue = bcs
        .u64()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return rewardGrowthValue;
    } catch (e) {
      console.log(e);
    }
  }

  public async getTickLowerIndex(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::tick_lower_index`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const tickIndexValue = bcs
        .u32()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return tickIndexValue;
    } catch (e) {
      console.log(e);
    }
  }

  public async getTickUpperIndex(positionId: string | TransactionArgument) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    txb.moveCall({
      target: `${targetPackage}::position::tick_upper_index`,
      arguments: [txnArgument(positionId, txb)],
    });
    const devInspectResult = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    try {
      const tickIndexValue = bcs
        .u32()
        .parse(new Uint8Array(devInspectResult.results[0].returnValues[0][0]));
      return tickIndexValue;
    } catch (e) {
      console.log(e);
    }
  }

  public async fetchAllRewards(positionId: string, address: string, pool: ExtendedPool) {
    const txb = new Transaction();
    txb.addSerializationPlugin(this.sdk.mvrNamedPackagesPlugin);
    const targetPackage = this.sdk.contractConst.mvrName || this.sdk.PackageId;

    const poolModel: PoolParams = {
      objectId: pool.poolId,
      tokenXType: pool.tokenXType,
      tokenYType: pool.tokenYType,
    };
    const rewarders = pool.rewarders;

    if (rewarders?.length > 0) {
      // @ts-ignore
      this.sdk.Pool.collectAllRewards(txb, poolModel, rewarders, positionId, address);
    }

    // @ts-ignore
    this.sdk.Pool.collectFee(txb, poolModel, positionId, address);
    const res = await this.sdk.rpcClient.devInspectTransactionBlock({
      transactionBlock: txb,
      sender: address,
    });

    console.log(res);

    const rewardsData = {
      feeCollected: {
        amountX: 0,
        amountY: 0,
      },
      rewards: [],
    };

    for (const event of res.events) {
      const { type, parsedJson } = event;

      if (type === `${targetPackage}::collect::CollectPoolRewardEvent`) {
        const { reward_coin_type, amount } = parsedJson as any;
        rewardsData.rewards.push({
          coinType: `0x${reward_coin_type.name}`,
          amount: parseInt(amount),
        });
      } else if (type === `${targetPackage}::collect::FeeCollectedEvent`) {
        const { amount_x, amount_y } = parsedJson as any;
        rewardsData.feeCollected = {
          amountX: parseInt(amount_x),
          amountY: parseInt(amount_y),
        };
      }
      console.log(rewardsData);
      return rewardsData;
    }
  }
}
