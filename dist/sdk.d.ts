import { PoolModule } from './modules/poolModule';
import { PositionModule } from './modules/positionModule';
import { RpcClient } from './modules/rpcClient';
import { ClmmConsts } from './types';
export declare class MmtSDK {
    protected readonly rpcModule: RpcClient;
    protected readonly poolModule: PoolModule;
    protected readonly positionModule: PositionModule;
    protected readonly isMainnet: boolean;
    protected readonly packageId: string;
    readonly baseUrl: string;
    readonly contractConst: ClmmConsts;
    /**
     * @deprecated use MmtSDK.NEW instead
     */
    constructor(suiClientUrl: string, packageId?: string, isMainnet?: boolean, mmtApiUrl?: string, contractConst?: ClmmConsts);
    static NEW(sdkParams?: {
        network?: 'mainnet' | 'testnet' | 'custom';
        clmm?: ClmmConsts;
        mmtApiUrl?: string;
        suiClientUrl?: string;
    }): MmtSDK;
    get rpcClient(): RpcClient;
    get Pool(): PoolModule;
    get Position(): PositionModule;
    get PackageId(): string;
    get BaseUrl(): string;
}
