import { MmtSDK, PoolModule, TickMath } from '../src';
import { describe, it, beforeEach, expect } from '@jest/globals';
import ALL_POOL_DATA from './__test_data__/all-pools.json';
import ALL_TOKEN_DATA from './__test_data__/all-tokens.json';
import { convertI32ToSigned } from '../src/utils/math/tickMath';
import BN from 'bn.js';
import { getCoinAmountFromLiquidity } from '../src/utils/poolUtils';
import Decimal from 'decimal.js';
import { ExtendedPoolWithApr } from '../src/types';

describe('PoolModule.collectAllPoolsRewards', () => {
  let sdk: MmtSDK;
  let poolModule: PoolModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    poolModule = sdk.Pool;

    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllPoolsApi')
      .mockResolvedValue(ALL_POOL_DATA);

    jest
      .spyOn(require('../src/utils/poolUtils'), 'fetchAllTokenApi')
      .mockResolvedValue(ALL_TOKEN_DATA);
  });

  it('test stable apr', async () => {
    const poolId = '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    // expect(pool.aprBreakdown.fee).toEqual('16.080169483414516253');
  }, 30000);

  it('test unStable apr', async () => {
    const poolId = '0x919a34b9df1d7a56fa078ae6ddc6bd203e284974704d85721062d38ee3a6701a';
    const allPools = await poolModule.getAllPools();
    const pool = allPools.filter((pool) => pool.poolId === poolId)[0];
    // expect(pool.aprBreakdown.fee).toEqual('804.51669792413246471');
  }, 30000);

  it('position apr should be defined', async () => {
    const userPositions = await sdk.Position.getAllUserPositions(
      '0xae55cde531ea8d707e69011301e78b2f21e6a0e1094e60033ab93a8e894e6871',
    );

    const tokens = await poolModule.getAllTokens();
    for (const position of userPositions) {
      const pool = await sdk.Pool.getPool(position.poolId, undefined, false);
      const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.lowerTick);
      const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.upperTick);
      const tokenXDecimals = pool.tokenX.decimals;
      const tokenYDecimals = pool.tokenY.decimals;
      const pool_lower_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacingUnsafe(
          new Decimal(position.lowerPrice),
          tokenXDecimals,
          tokenYDecimals,
          pool.tickSpacing,
        ),
      );
      const pool_upper_tick_index = convertI32ToSigned(
        TickMath.priceToTickIndexWithTickSpacingUnsafe(
          new Decimal(position.upperPrice),
          tokenXDecimals,
          tokenYDecimals,
          pool.tickSpacing,
        ),
      );
      const liquidityAmounts = getCoinAmountFromLiquidity(
        new BN(position.liquidity),
        new BN(pool.currentSqrtPrice!),
        lowerSqrtPrice,
        upperSqrtPrice,
        true,
      );

      const rewardsArr = pool.rewarders?.map((rewarder) => {
        const coinType = rewarder.coin_type;
        const token = tokens.find((token) => token.coinType === coinType);
        return {
          rewardsAmount: Number(rewarder.reward_amount),
          rewardsPrice: token?.price,
          rewardsDecimal: token?.decimals,
          coinType: coinType,
          hasEnded: rewarder.hasEnded,
          flowRate: rewarder.flow_rate,
        };
      });

      const aprData = await sdk.Pool.estPositionAPRWithDeltaMethod(
        convertI32ToSigned(Number(pool.currentTickIndex)),
        pool_lower_tick_index,
        pool_upper_tick_index,
        new BN(pool.currentSqrtPrice),
        new BN(pool.liquidity),
        tokenXDecimals,
        tokenYDecimals,
        Number(pool?.lpFeesPercent),
        (Number(liquidityAmounts.coinA) / 10 ** tokenXDecimals).toString(),
        (Number(liquidityAmounts.coinB) / 10 ** tokenYDecimals).toString(),
        pool.volume24h,
        pool.tokenX.price.toString(),
        pool.tokenY.price.toString(),
        rewardsArr,
      );
      expect(aprData.feeAPR).toBeDefined();
    }
  }, 30000);

  it('position apr should be defined use liquidityHM', async () => {
    jest.spyOn(sdk.Pool, 'getPool').mockResolvedValue(mockPool);

    const position = mockPosition;
    const tokens = await poolModule.getAllTokens();

    const pool = await sdk.Pool.getPool(position.poolId, undefined, false);
    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.lowerTick);
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.upperTick);
    const tokenXDecimals = pool.tokenX.decimals;
    const tokenYDecimals = pool.tokenY.decimals;
    const pool_lower_tick_index = convertI32ToSigned(
      TickMath.priceToTickIndexWithTickSpacingUnsafe(
        new Decimal(position.lowerPrice),
        tokenXDecimals,
        tokenYDecimals,
        pool.tickSpacing,
      ),
    );
    const pool_upper_tick_index = convertI32ToSigned(
      TickMath.priceToTickIndexWithTickSpacingUnsafe(
        new Decimal(position.upperPrice),
        tokenXDecimals,
        tokenYDecimals,
        pool.tickSpacing,
      ),
    );
    const liquidityAmounts = getCoinAmountFromLiquidity(
      new BN(position.liquidity),
      new BN(pool.currentSqrtPrice!),
      lowerSqrtPrice,
      upperSqrtPrice,
      true,
    );

    const rewardsArr = pool.rewarders?.map((rewarder) => {
      const coinType = rewarder.coin_type;
      const token = tokens.find((token) => token.coinType === coinType);
      return {
        rewardsAmount: Number(rewarder.reward_amount),
        rewardsPrice: token?.price,
        rewardsDecimal: token?.decimals,
        coinType: coinType,
        hasEnded: rewarder.hasEnded,
        flowRate: rewarder.flow_rate,
      };
    });

    const aprData = await sdk.Pool.estPositionAPRWithLiquidityHM(
      convertI32ToSigned(Number(pool.currentTickIndex)),
      pool_lower_tick_index,
      pool_upper_tick_index,
      new BN(pool.currentSqrtPrice),
      new BN(pool.liquidity),
      new BN(pool.liquidityHM),
      tokenXDecimals,
      tokenYDecimals,
      Number(pool?.lpFeesPercent),
      (Number(liquidityAmounts.coinA) / 10 ** tokenXDecimals).toString(),
      (Number(liquidityAmounts.coinB) / 10 ** tokenYDecimals).toString(),
      pool.volume24h,
      pool.tokenX.price.toString(),
      pool.tokenY.price.toString(),
      rewardsArr,
    );

    expect(aprData.feeAPR).toEqual(new Decimal('0.26925890311683130058'));
  }, 30000);

  const mockPool = {
    poolId: '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b',
    tokenXType: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
    tokenYType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
    tickSpacing: 2,
    lpFeesPercent: '0.0100',
    protocolFeesPercent: '20.0000',
    isStable: true,
    currentSqrtPrice: '18451651944798285563',
    currentTickIndex: '5',
    liquidity: '251842323407205803',
    liquidityHM: '244484223776507078',
    tokenXReserve: '12404380589875',
    tokenYReserve: '22367934605192',
    tvl: '34741008.1274742',
    volume24h: '10826953.977457730287700000',
    fees24h: '1082.796344364912904940',
    apy: '12.086449042888058000',
    timestamp: '2025-06-06T21:26:41.055Z',
    tokenX: {
      coinType: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT',
      name: 'Tether (Sui Bridge)',
      ticker: 'suiUSDT',
      iconUrl: 'https://momentum-statics.s3.us-west-1.amazonaws.com/suiUSDT.png',
      decimals: 6,
      description: 'Bridged Tether token',
      isVerified: true,
      isMmtWhitelisted: true,
      tokenType: '',
      price: '0.99928675',
    },
    tokenY: {
      coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
      name: 'USDC',
      ticker: 'USDC',
      iconUrl: 'https://circle.com/usdc-icon',
      decimals: 6,
      description:
        'USDC is a US dollar-backed stablecoin issued by Circle. USDC is designed to provide a faster, safer, and more efficient way to send, spend, and exchange money around the world.',
      isVerified: true,
      isMmtWhitelisted: true,
      tokenType: '',
      price: '0.99899590',
    },
    rewarders: [
      {
        hasEnded: true,
        coin_type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
        flow_rate: '21350398233460129185185',
        reward_amount: '100000000',
        rewards_allocated: '99999999',
      },
      {
        hasEnded: false,
        coin_type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
        flow_rate: '695122613965314316136556256',
        reward_amount: '59650000000000',
        rewards_allocated: '50891567180557',
      },
    ],
    aprBreakdown: {
      total: '12.086449042888058000',
      fee: '1.083625430324804000',
      rewards: [[Object]],
    },
  } as unknown as ExtendedPoolWithApr;
  const mockPosition = {
    objectId: '0x5d04e35cc49d057da97ada62ee78e98d5f1b577158c7412eebbfc12335ed29a3',
    poolId: '0xb0a595cb58d35e07b711ac145b4846c8ed39772c6d6f6716d89d71c64384543b',
    upperPrice: 1.000800280056007,
    lowerPrice: 0.9996000999800035,
    upperTick: 8,
    lowerTick: 4294967292,
    liquidity: new BN('45407263'),
    amount: 0.027179675672750002,
    status: 'In Range',
    claimableRewards: 0.00007750994118759999,
    rewarders: [
      {
        coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
        amount: 0,
      },
      {
        coinType: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
        amount: 19729,
      },
    ],
    feeAmountXUsd: 0.00000699500725,
    feeAmountYUsd: 0.000007978454799999999,
    feeAmountX: 7,
    feeAmountY: 8,
  };
});
