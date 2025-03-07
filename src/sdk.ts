import { PoolModule } from './modules/poolModule';
import { PositionModule } from './modules/positionModule';
import { RpcClient } from './modules/rpcClient';
import { ClmmConsts } from './types';
import { Config } from './config';

export class MmtSDK {
  protected readonly rpcModule: RpcClient;

  protected readonly poolModule: PoolModule;

  protected readonly positionModule: PositionModule;

  protected readonly packageId: string;

  public readonly baseUrl: string;

  public readonly contractConst: ClmmConsts;

  /**
   * @deprecated use MmtSDK.NEW instead
   */
  constructor(
    suiClientUrl: string,
    packageId: string = '',
    isMainnet: boolean = true,
    mmtApiUrl: string = '',
    contractConst?: ClmmConsts,
  ) {
    this.rpcModule = new RpcClient({
      url: suiClientUrl,
    });
    const network = isMainnet ? 'mainnet' : 'testnet';
    this.baseUrl = mmtApiUrl || Config.getDefaultMmtApiUrl(network);
    this.contractConst = contractConst || {
      ...Config.getDefaultClmmParams(network),
      ...(packageId ? { packageId } : {}),
    };
    this.poolModule = new PoolModule(this);
    this.positionModule = new PositionModule(this);
  }

  static NEW(sdkParams?: {
    network?: 'mainnet' | 'testnet' | 'custom';
    contractConst?: ClmmConsts;
    mmtApiUrl?: string;
    suiClientUrl?: string;
  }) {
    if (sdkParams.network === 'custom' && !sdkParams?.contractConst) {
      throw new Error('missing contractConst for custom network');
    }
    const network = sdkParams?.network || 'mainnet';
    const clmm = sdkParams?.contractConst ?? { ...Config.getDefaultClmmParams(network) };
    const mmtApiUrl = sdkParams?.mmtApiUrl || Config.getDefaultMmtApiUrl(network);
    const suiClientUrl = sdkParams?.suiClientUrl || Config.getDefaultSuiClientUrl(network);
    return new MmtSDK(suiClientUrl, clmm.packageId, network !== 'testnet', mmtApiUrl, clmm);
  }

  get rpcClient(): RpcClient {
    return this.rpcModule;
  }

  get Pool(): PoolModule {
    return this.poolModule;
  }

  get Position(): PositionModule {
    return this.positionModule;
  }

  get PackageId(): string {
    return this.contractConst.packageId;
  }

  get BaseUrl(): string {
    return this.baseUrl;
  }
}
