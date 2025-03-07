import { Transaction } from '@mysten/sui/transactions';
import { PositionRpc } from '../types';

export const txnArgument = (object: any, tx: Transaction) => {
  return typeof object === 'string' ? tx.object(object) : object;
};

export function transformPositionRpcObject(initialObject: any): PositionRpc {
  return {
    id: initialObject.id.id,
    pool_id: initialObject.pool_id,
    fee_rate: Number(initialObject.fee_rate),
    type_x: initialObject.type_x,
    type_y: initialObject.type_y,
    tick_lower_index: Number(initialObject.tick_lower_index),
    tick_upper_index: Number(initialObject.tick_upper_index),
    liquidity: BigInt(initialObject.liquidity),
    fee_growth_inside_x_last: BigInt(initialObject.fee_growth_inside_x_last),
    fee_growth_inside_y_last: BigInt(initialObject.fee_growth_inside_y_last),
    owed_coin_x: Number(initialObject.owed_coin_x),
    owed_coin_y: Number(initialObject.owed_coin_y),
    reward_infos: initialObject.reward_infos.map((rewardInfo: any) => ({
      reward_type: rewardInfo.reward_type,
      reward_amount: BigInt(rewardInfo.reward_amount),
    })),
  };
}

//   export function getRewardersAPYByPool(poolId: string){
//     const headers = {
//             "Content-Type": "application/json",
//         };
//         const method = "GET"
//         const options = {
//             method,
//             headers,
//             body: null as null | string,
//         };

//         const response = await fetch(`${ModuleConstants.poolApiUrl}/${poolId}`, options);
//         if (!response.ok) {
//             throw new Error(`Request failed with status ${response.status}`);
//         }

//         return await response.json() as PoolApi;

//   }
