import { PoolModule } from './modules/poolModule';
import { PositionModule } from './modules/positionModule';
import { ClmmConsts } from './types';
import { Config } from './config';
import { SuiClient } from '@mysten/sui/client';
import { RouteModule } from './modules/routeModule';

export class MmtSDK {
  protected readonly rpcModule: SuiClient;

  protected readonly poolModule: PoolModule;

  protected readonly positionModule: PositionModule;

  protected readonly routeModule: RouteModule;

  public readonly baseUrl: string;

  public readonly contractConst: ClmmConsts;

  public readonly customHeaders?: HeadersInit;

  /**
   * @deprecated use MmtSDK.NEW instead
   */
  constructor(
    suiClientUrl: string,
    packageId: string = '',
    isMainnet: boolean = true,
    mmtApiUrl: string = '',
    contractConst?: ClmmConsts,
    client?: SuiClient,
    customHeaders?: HeadersInit,
  ) {
    if (client) {
      this.rpcModule = client;
    } else if (suiClientUrl) {
      this.rpcModule = new SuiClient({ url: suiClientUrl });
    }
    const network = isMainnet ? 'mainnet' : 'testnet';
    this.baseUrl = mmtApiUrl || Config.getDefaultMmtApiUrl(network);
    this.contractConst = contractConst || {
      ...Config.getDefaultClmmParams(network),
      ...(packageId ? { packageId } : {}),
    };
    this.customHeaders = customHeaders;
    this.poolModule = new PoolModule(this);
    this.positionModule = new PositionModule(this);
    this.routeModule = new RouteModule(this);
  }

  static NEW(sdkParams?: {
    network?: 'mainnet' | 'testnet' | 'custom';
    contractConst?: ClmmConsts;
    mmtApiUrl?: string;
    suiClientUrl?: string;
    client?: SuiClient;
    customHeaders?: HeadersInit;
  }) {
    if (sdkParams.network === 'custom' && !sdkParams?.contractConst) {
      throw new Error('missing contractConst for custom network');
    }
    const network = sdkParams?.network || 'mainnet';
    const clmm = sdkParams?.contractConst ?? { ...Config.getDefaultClmmParams(network) };
    const mmtApiUrl = sdkParams?.mmtApiUrl || Config.getDefaultMmtApiUrl(network);
    const suiClientUrl = sdkParams?.suiClientUrl || Config.getDefaultSuiClientUrl(network);
    if (!suiClientUrl.trim() && !sdkParams?.client) {
      throw new Error('Either suiClientUrl or client must be provided');
    }
    return new MmtSDK(
      suiClientUrl,
      clmm.packageId,
      network !== 'testnet',
      mmtApiUrl,
      clmm,
      sdkParams?.client,
      sdkParams?.customHeaders,
    );
  }

  get rpcClient(): SuiClient {
    return this.rpcModule;
  }

  get Pool(): PoolModule {
    return this.poolModule;
  }

  get Position(): PositionModule {
    return this.positionModule;
  }

  get Route(): RouteModule {
    return this.routeModule;
  }

  get PackageId(): string {
    return this.contractConst.packageId;
  }

  get BaseUrl(): string {
    return this.baseUrl;
  }
}
