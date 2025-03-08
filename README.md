# MMT Finance CLMM SDK

`@mmt-finance/clmm-sdk` is the official TypeScript SDK for integrating with
MMT Finance CLMM for developers. Please visit 
[MMT Developer Docs](https://developers.mmt.finance/clmm-sdk/integrations)
for detailed guideline.

## Getting Started

### Installation

```sh
npm i @mmt-finance/clmm-sdk
```

### Configuration

Our SDK has pre-configured network settings that allows you to connect to MMT CLMM
on both mainnet and testnet.
You can utilize the src/sdk NEW method to swiftly initialize the configuration. 

```typescript
import { MmtSDK } from '@mmt-finance/clmm-sdk'

const mmtClmmSDK = MmtSDK.NEW({
  network: 'mainnet',
});
```

Now, you can start using MMT SDK.

### Supported Features

* [Retrieve pool data](https://developers.mmt.finance/features/read-pool-data)
* [Retrieve user data](https://developers.mmt.finance/features/read-user-data)
* [Swap](https://developers.mmt.finance/features/swap)
* [Open and Add Liquidity](https://developers.mmt.finance/features/open-and-add-liquidity)
* [Position Management](https://developers.mmt.finance/features/position-management)
* [Claim Fees and Rewards](https://developers.mmt.finance/features/claim-fees-and-rewards)
* [Close Position](https://developers.mmt.finance/features/close-position)

For a full detailed technical integration doc, please visit 
[MMT Developer Docs](https://developers.mmt.finance/clmm-sdk/integrations).

### Examples
A comprehensive set of examples has been provided to demonstrate the fundamental usage of the SDK. 
Please refer to the detailed guidelines for further information [example](examples/README.md)