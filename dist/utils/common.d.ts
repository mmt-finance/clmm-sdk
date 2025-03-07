import { Transaction } from '@mysten/sui/transactions';
import { PositionRpc } from '../types';
export declare const txnArgument: (object: any, tx: Transaction) => any;
export declare function transformPositionRpcObject(initialObject: any): PositionRpc;
