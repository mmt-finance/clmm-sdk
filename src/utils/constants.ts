import BN from 'bn.js';

export class ModuleConstants {
  public static readonly migrationPackageId =
    '0x54ed634a018904b66871bd30e9b9ccafcf9bfc192aa84c06b0931276c7afd22b';
  public static readonly suiCoinType = '0x2::sui::SUI';
  public static readonly CETUS_GLOBAL_CONFIG_ID =
    '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f';

  public static readonly functions = {
    swapX: 'swap_token_x',
    swapY: 'swap_token_y',
  };
}

export const MAX_TICK_INDEX = 443636;

export const MIN_TICK_INDEX = -443636;

export const MAX_SQRT_PRICE = '79226673515401279992447579055';

export const TICK_ARRAY_SIZE = 64;

export const MIN_SQRT_PRICE = '4295048016';

export const FEE_RATE_DENOMINATOR = new BN(1_000_000);

export const DRY_RUN_PATH_LEN = 5;

export const U64_MAX = BigInt('18446744073709551615');
