import { PoolModule } from './modules/poolModule';
import { PositionModule } from './modules/positionModule';
import { ClmmConsts } from './types';
import { Config } from './config';
import { SuiClient } from '@mysten/sui/client';
import { RouteModule } from './modules/routeModule';
import { AggregatorModule } from './modules/aggregatorModule';
import { namedPackagesPlugin } from './utils/mvr/mvrNamedPackagesPlugin';

export class MmtSDK {
  protected readonly rpcModule: SuiClient;

  protected readonly poolModule: PoolModule;

  protected readonly positionModule: PositionModule;

  protected readonly routeModule: RouteModule;

  protected readonly aggregatorModule: AggregatorModule;

  public readonly baseUrl: string;

  public readonly contractConst: ClmmConsts;

  public readonly customHeaders?: HeadersInit;

  public readonly mvrNamedPackagesPlugin: any;

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
    mvrEndpoint?: string,
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
    this.aggregatorModule = new AggregatorModule(this);
    this.mvrNamedPackagesPlugin = namedPackagesPlugin({
      url: mvrEndpoint,
    });
  }

  static NEW(sdkParams?: {
    network?: 'mainnet' | 'testnet' | 'custom';
    contractConst?: ClmmConsts;
    mmtApiUrl?: string;
    suiClientUrl?: string;
    client?: SuiClient;
    customHeaders?: HeadersInit;
    mvrEndpoint?: string;
  }) {
    if (sdkParams.network === 'custom' && !sdkParams?.contractConst) {
      throw new Error('missing contractConst for custom network');
    }
    const network = sdkParams?.network || 'mainnet';
    const clmm = sdkParams?.contractConst ?? { ...Config.getDefaultClmmParams(network) };
    const mmtApiUrl = sdkParams?.mmtApiUrl || Config.getDefaultMmtApiUrl(network);
    const suiClientUrl = sdkParams?.suiClientUrl || Config.getDefaultSuiClientUrl(network);
    const mvrEndpoint = sdkParams?.mvrEndpoint || Config.getDefaultMvrEndpoint(network);
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
      mvrEndpoint,
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

  get Aggregator(): AggregatorModule {
    return this.aggregatorModule;
  }

  get PackageId(): string {
    return this.contractConst.packageId;
  }

  get BaseUrl(): string {
    return this.baseUrl;
  }
}
