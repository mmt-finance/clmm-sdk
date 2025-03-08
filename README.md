# MMT Finance CLMM SDK

MMT Finance CLMM SDK is the official Typescript SDK for CLMM at dev integration
with MMT Finance CLMM.

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

For a full detailed technical integration doc, please visit [MMT Developer Docs]().

### Examples
Please check here [example](examples/README.md)