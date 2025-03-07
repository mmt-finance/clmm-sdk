import { SuiClient, SuiEventFilter, SuiObjectResponseQuery } from '@mysten/sui/client';
export declare class RpcClient extends SuiClient {
    queryEventsByPage(query: SuiEventFilter, cursor?: any, limit?: number | null): Promise<any[]>;
    fetchOwnedObjects(owner: string, query: SuiObjectResponseQuery, maxIter?: number, cursor?: any, limit?: number | null): Promise<any[]>;
}
