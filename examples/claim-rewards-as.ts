import { MmtSDK } from '../src';
import { executeTxExample } from './example-utils';
import { Transaction } from '@mysten/sui/transactions';

const targetCoinType = [
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
][0];

const senders = [
  '0xcc272efb5778a6bfbfd1b5ead67d4fa428771082ddaf151a25c7217b6b72b7b9', // 4 positions, 2 rewarders
  '0x69549aee762551cba111095374c4c201d5bd4b7b10f3b45b951331fcee942b48', // 1 position, 2 rewarders
  '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871', // 4 position, 6 rewarder
  '0x6bf60b81f388ebe514c33856a5008ae058e56238fe5f73c57348afa10d05121b', // 29 positions,
  '0xc12b59a35f98edd31f9e171ee73d1e51d7859509214e981d1b3438e5a7c36d23', // 1 position, 3 rewarder
];

export async function main() {
  // Initialize SDK & senderAddress
  const sdk = MmtSDK.NEW({
    network: 'mainnet',
  });
  const txb = new Transaction();
  const senderAddress = senders[4];
  const positions = await sdk.Position.getAllUserPositions(senderAddress);

  console.log('\n\n\npositions\n\n\n', positions);

  if (positions.length === 0) {
    console.log('No positions found for this address:', senderAddress);
    return;
  }

  console.log('\n\n\npositions length\n\n\n', positions.length);
  console.log(
    '\n\n\n rewarders length\n\n\n',
    positions.reduce((acc, position) => acc + position.rewarders.length, 0),
  );

  const pools = await sdk.Pool.getAllPools();
  // const positions = [
  //   {
  //     objectId: '0x460f1fe3e3fc7f96dd906318e4e9a02740bb7048203af5d3752b5eeeb5e3e2b9',
  //     poolId: '0x997d5f4964e7b7dc5bf3c990cbd17e16f48638329d6bc8051aaf512574ee329e',
  //     upperPrice: 0.18341281232212225,
  //     lowerPrice: 0.1321259740407672,
  //     upperTick: 52120,
  //     lowerTick: 48840,
  //     amount: 403.874219071499,
  //     status: 'In Range',
  //     claimableRewards: 0.02525474467707878,
  //     rewarders: [],
  //     feeAmountXUsd: 0.005980596204440001,
  //     feeAmountYUsd: 0.01927414847263878,
  //     feeAmountX: 8684,
  //     feeAmountY: 4800306,
  //   },
  //   {
  //     objectId: '0x5bf3fd241266c11894f24e86dd43e0022bcec46b4a98b87079f8a53cd104932d',
  //     poolId: '0x9b06ea8e1a0ee5c86f0b47512a3337e3c9c4e235c4ec698d15b51b0a8ec3e5a9',
  //     upperPrice: 0.06278982347702247,
  //     lowerPrice: 0.039957468954302806,
  //     upperTick: 41400,
  //     lowerTick: 36880,
  //     amount: 343.72062690579867,
  //     status: 'In Range',
  //     claimableRewards: 0.0006919935603737,
  //     rewarders: [],
  //     feeAmountXUsd: 0.000009451135189999999,
  //     feeAmountYUsd: 0.0006825424251837001,
  //     feeAmountX: 49,
  //     feeAmountY: 169990,
  //   },
  //   {
  //     objectId: '0x820cce8cf0f9148d27b25744918301f1ae0ed45927dbff8d4c99b399ab30889a',
  //     poolId: '0xd970616a91e67a2aea8347bc6444ee6cab11657718ff0c4b833d4f5de12efad0',
  //     upperPrice: 1.061196484161654,
  //     lowerPrice: 1.0569603878667264,
  //     upperTick: 594,
  //     lowerTick: 554,
  //     amount: 964.3169780151682,
  //     status: 'In Range',
  //     claimableRewards: 0.0007289260639708501,
  //     rewarders: [
  //       '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //       '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
  //     ],
  //     feeAmountXUsd: 0.00000682998604002,
  //     feeAmountYUsd: 2.8909379736000003e-7,
  //     feeAmountX: 1602,
  //     feeAmountY: 72,
  //   },
  //   {
  //     objectId: '0xe25b4eb044df49df3ab3c732a5f006f03a0bc26b5bcbb4b01cfadf5462eac4bb',
  //     poolId: '0x53f204110bf072d08d64902b7a70ce07acfd7adfe6574da119f8ef56e635f44f',
  //     upperPrice: 0.012781173455966351,
  //     lowerPrice: 0.00887280972392799,
  //     upperTick: -43600,
  //     lowerTick: -47250,
  //     amount: 925.7194186414206,
  //     status: 'In Range',
  //     claimableRewards: 0.031078725297485735,
  //     rewarders: [],
  //     feeAmountXUsd: 0.00018798500859615,
  //     feeAmountYUsd: 0.030890740288889586,
  //     feeAmountX: 3856613,
  //     feeAmountY: 7693466,
  //   },
  //   {
  //     objectId: '0x19b058fc1e8afc5e4121692162777463f0e62273a9a4e26e158ce6573c17c6a1',
  //     poolId: '0x9c92c5b8e9d83e485fb4c86804ac8b920bb0beaace5e61a5b0239218f627f8e9',
  //     upperPrice: 1.0012006602200496,
  //     lowerPrice: 1.00020001,
  //     upperTick: 12,
  //     lowerTick: 2,
  //     amount: 1.505567150484393,
  //     status: 'In Range',
  //     claimableRewards: 0.0006669273449346301,
  //     rewarders: [
  //       '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //       '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
  //     ],
  //     feeAmountXUsd: 0.00006392988113286001,
  //     feeAmountYUsd: 0.00011172672229638001,
  //     feeAmountX: 15922,
  //     feeAmountY: 27826,
  //   },
  //   {
  //     objectId: '0x01f39438d5bc49902aaabe045b0386612a89ee0d6799fac67bd27828fce5741c',
  //     poolId: '0x9b06ea8e1a0ee5c86f0b47512a3337e3c9c4e235c4ec698d15b51b0a8ec3e5a9',
  //     upperPrice: 0.05415229816711353,
  //     lowerPrice: 0.04899927063365333,
  //     upperTick: 39920,
  //     lowerTick: 38920,
  //     amount: 0.0018285053388,
  //     status: 'Above Range',
  //     claimableRewards: 0.00007203670459153999,
  //     rewarders: [],
  //     feeAmountXUsd: 0.000036068617969999995,
  //     feeAmountYUsd: 0.000035968086621540004,
  //     feeAmountX: 187,
  //     feeAmountY: 8958,
  //   },
  //   // {
  //   //   objectId: '0x32049d08e19f9ebd7da2594c185bd3c31d54dcc5ab30edd78b16fcf092f36727',
  //   //   poolId: '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b',
  //   //   upperPrice: 1.0102516821257919,
  //   //   lowerPrice: 0.9900503287412095,
  //   //   upperTick: 102,
  //   //   lowerTick: -100,
  //   //   amount: 0.00999764569258,
  //   //   status: 'In Range',
  //   //   claimableRewards: 0.00000638452147996,
  //   //   rewarders: [
  //   //   '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  //   //     '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //   //     '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
  //   //   ],
  //   //   feeAmountXUsd: 0.0000010000467099999998,
  //   //   feeAmountYUsd: 9.9988551e-7,
  //   //   feeAmountX: 1,
  //   //   feeAmountY: 1,
  //   // },
  //   {
  //     objectId: '0x5b14c4729ede175fb80a881c9f8fdbc24ed82790cdbb72920924b294fbd33a62',
  //     poolId: '0x9b06ea8e1a0ee5c86f0b47512a3337e3c9c4e235c4ec698d15b51b0a8ec3e5a9',
  //     upperPrice: 0.04998907157502258,
  //     lowerPrice: 0.04783734510914912,
  //     upperTick: 39120,
  //     lowerTick: 38680,
  //     amount: 0.5330136409241597,
  //     status: 'In Range',
  //     claimableRewards: 0.15625673137845975,
  //     rewarders: [],
  //     feeAmountXUsd: 0.07768524517684,
  //     feeAmountYUsd: 0.07857148620161976,
  //     feeAmountX: 402764,
  //     feeAmountY: 19568552,
  //   },
  //   // {
  //   //   objectId: '0x5d04e35cc49d057da97ada62ee78e98d5f1b577158c7412eebbfc12335ed29a3',
  //   //   poolId: '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b',
  //   //   upperPrice: 1.000800280056007,
  //   //   lowerPrice: 0.9996000999800035,
  //   //   upperTick: 8,
  //   //   lowerTick: -4,
  //   //   amount: 0.02723673467658,
  //   //   status: 'In Range',
  //   //   claimableRewards: 0.00019267702022804,
  //   //   rewarders: [
  //   //     '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  //   //     '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  //   //     '0x2b6602099970374cf58a2a1b9d96f005fccceb81e92eb059873baf420eb6c717::x_sui::X_SUI',
  //   //   ],
  //   //   feeAmountXUsd: 0.000011000513809999999,
  //   //   feeAmountYUsd: 0.00001099874061,
  //   //   feeAmountX: 11,
  //   //   feeAmountY: 11,
  //   // },
  // ];

  for (const position of positions) {
    const pool = pools.find((pool) => pool.poolId === position.poolId);

    if (!pool) {
      console.log('Pool not found for position:', position.poolId);
      continue;
    }

    await sdk.Pool.claimRewardsAs({
      txb,
      pool: {
        objectId: pool.poolId,
        tokenXType: pool.tokenXType,
        tokenYType: pool.tokenYType,
      },
      positionId: position.objectId,
      // rewarderCoinTypes: position.rewarders.map((rewarder) => rewarder.coinType),
      rewarderCoinTypes: position.rewarders.map((rewarder) => rewarder.coinType),
      targetCoinType,
      slippage: 1,
      useMvr: false,
      toAddress: senderAddress,
      pools,
    });

    await sdk.Pool.claimFeeAs({
      txb,
      pool: {
        objectId: pool.poolId,
        tokenXType: pool.tokenXType,
        tokenYType: pool.tokenYType,
      },
      positionId: position.objectId,
      targetCoinType,
      slippage: 1,
      useMvr: false,
      toAddress: senderAddress,
      pools,
    });
  }
  // }

  console.log('\n\n\n time \n\n\n', sdk.Pool.time);

  const resp = await executeTxExample({
    tx: txb,
    sdk,
    execution: { dryRun: true, address: senderAddress },
  });

  // console.log('\n\n\nresp\n\n\n', resp);
}

main()
  .then(() => console.log(`\n\n\nClaim fee as ${targetCoinType} successfully`))
  .catch((error) => console.error(`\n\n\nClaim fee as ${targetCoinType} failed:`, error));
