import { BaseModule } from '../interfaces/BaseModule';
import { MmtSDK } from '../sdk';
import { TokenSchema } from '../types';
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
}
