import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { TokenSchema } from '../types';

export interface SwapDataParams {
  userWalletAddress: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  rawAmount: string;
  slippage?: string;
}

export interface QuoteParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  rawAmount: string;
  slippage?: string;
  excludeDexIds?: string[];
}

export class AggregatorModule implements BaseModule {
  protected _sdk: MmtSDK;

  constructor(sdk: MmtSDK) {
    this._sdk = sdk;
  }

  get sdk() {
    return this._sdk;
  }

  public async getAllOkxTokens(headers?: HeadersInit): Promise<TokenSchema[]> {
    const tokens = await this.fetchAllOkxTokensApi(this.sdk.baseUrl, {
      ...this.sdk.customHeaders,
      ...headers,
    });
    return tokens;
  }

  public async fetchAllOkxTokensApi(baseUrl: string, headers?: HeadersInit) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
      method: 'GET',
      headers: mergedHeaders,
      body: null as null | string,
    };

    const response = await fetch(`${baseUrl}/aggregator/tokens`, options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json())?.data as TokenSchema[];
  }

  public async getAggregatorLiquidity(headers?: HeadersInit): Promise<any> {
    return this.fetchLiquidityApi(this.sdk.baseUrl, {
      ...this.sdk.customHeaders,
      ...headers,
    });
  }

  public async fetchLiquidityApi(baseUrl: string, headers?: HeadersInit) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const options = {
      method: 'GET',
      headers: mergedHeaders,
      body: null as null | string,
    };
    const response = await fetch(`${baseUrl}/aggregator/liquidity`, options);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
  }

  public async getSwapData(params: SwapDataParams, headers?: HeadersInit): Promise<any> {
    return this.fetchSwapDataApi(this.sdk.baseUrl, params, {
      ...this.sdk.customHeaders,
      ...headers,
    });
  }

  public async fetchSwapDataApi(baseUrl: string, params: SwapDataParams, headers?: HeadersInit) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const url = new URL(`${baseUrl}/aggregator/swap-data`);
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const options = {
      method: 'GET',
      headers: mergedHeaders,
    };
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
  }

  public async getQuote(params: QuoteParams, headers?: HeadersInit): Promise<any> {
    return this.fetchQuoteApi(this.sdk.baseUrl, params, {
      ...this.sdk.customHeaders,
      ...headers,
    });
  }

  public async fetchQuoteApi(baseUrl: string, params: QuoteParams, headers?: HeadersInit) {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const mergedHeaders = { ...defaultHeaders, ...headers };
    const url = new URL(`${baseUrl}/aggregator/quote`);
    if (params.excludeDexIds) {
      url.searchParams.append('excludeDexIds', params.excludeDexIds.join(','));
    }
    Object.keys(params).forEach((key) => {
      if (key !== 'excludeDexIds') {
        url.searchParams.append(key, params[key]);
      }
    });

    const options = {
      method: 'GET',
      headers: mergedHeaders,
    };
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return (await response.json())?.data;
  }
}
