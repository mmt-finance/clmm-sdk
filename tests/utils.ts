import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';

/**
 * Check if the given addresses are same address
 * @param address1 address 1
 * @param address2 address 2
 * @returns if two addresses are equal
 */
export function isSameAddress(address1: string, address2: string) {
  return normalizeSuiAddress(address1) === normalizeSuiAddress(address2);
}

/**
 * Check if the given structs are same
 * @param struct1 struct 1
 * @param struct2 struct 2
 * @returns if two struct are equal
 */
export function isSuiStructEqual(struct1: string, struct2: string) {
  return normalizeStructTag(struct1) === normalizeStructTag(struct2);
}

/**
 * Check if is coin object type
 * @param struct struct
 * @returns if is coin object type
 */
export function isCoinObjectType(struct: string) {
  const normalized = normalizeStructTag(struct);
  const coinPrefix = normalizeStructTag('0x2::coin::Coin');
  return normalized.startsWith(coinPrefix);
}
