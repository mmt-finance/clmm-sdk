# MMT Finance CLMM SDK

`@mmt-finance/clmm-sdk` is the official TypeScript SDK for integrating with
MMT Finance CLMM for developers. Please visit
[MMT Developer Docs](https://developers.mmt.finance/clmm-sdk/integrations)
for detailed guideline.

## 项目介绍

`@mmt-finance/clmm-sdk` 是 Momentum DEX 集中流动性（CLMM）的 TypeScript SDK。它读取池子、仓位和报价，并把兑换、开仓、加减流动性、领取手续费和奖励、平仓组装成 Sui 可编程交易。交易由调用方用自己的钱包签名并提交。SDK 不保管服务端私钥，也不会代替用户把交易发上链。

Momentum 的 CLMM 负责池内的价格区间和流动性。veMMT 是锁仓投票层：V1 见 `@mmt-finance/ve-sdk-v1`，V2 见 `@mmt-finance/ve-sdk-v2`。本包不计算投票权，也不提交 veMMT 投票交易。

入口是 `src/index.ts`，对外导出 `MmtSDK`、`PoolModule`、`PositionModule` 和 `TickMath`。`src/sdk.ts` 的 `MmtSDK.NEW` 按网络创建客户端。池子和兑换在 `src/modules/poolModule.ts`，仓位在 `src/modules/positionModule.ts`，路径在 `src/modules/routeModule.ts`，聚合报价在 `src/modules/aggregatorModule.ts`。

## Getting Started

### Installation

```sh
npm i @mmt-finance/clmm-sdk
```

### Configuration

Our SDK has pre-configured network settings that allows you to connect to MMT CLMM
on both mainnet and testnet.
You can call `MmtSDK.NEW` to initialize the configuration.

```typescript
import { MmtSDK } from '@mmt-finance/clmm-sdk';

const mmtClmmSDK = MmtSDK.NEW({
  network: 'mainnet',
});
```

Now, you can start using MMT SDK.

### Supported Features

- [Retrieve pool data](https://developers.mmt.finance/features/read-pool-data)
- [Retrieve user data](https://developers.mmt.finance/features/read-user-data)
- [Swap](https://developers.mmt.finance/features/swap)
- [Open and Add Liquidity](https://developers.mmt.finance/features/open-and-add-liquidity)
- [Position Management](https://developers.mmt.finance/features/position-management)
- [Claim Fees and Rewards](https://developers.mmt.finance/features/claim-fees-and-rewards)
- [Close Position](https://developers.mmt.finance/features/close-position)

For a full detailed technical integration doc, please visit
[MMT Developer Docs](https://developers.mmt.finance/clmm-sdk/integrations).

### Examples

A comprehensive set of examples has been provided to demonstrate the fundamental usage of the SDK.
Please refer to the detailed guidelines for further information [example](examples/README.md)
