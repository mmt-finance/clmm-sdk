import { PositionStatus } from '../types';

export const getPositionStatus = (
  currentSqrtPrice: number,
  lowerSqrtPrice: number,
  upperSqrtPrice: number,
): PositionStatus => {
  if (currentSqrtPrice < lowerSqrtPrice) {
    return PositionStatus['Above Range'];
  } else if (currentSqrtPrice <= upperSqrtPrice && currentSqrtPrice >= lowerSqrtPrice) {
    return PositionStatus['In Range'];
  } else if (currentSqrtPrice > upperSqrtPrice) {
    return PositionStatus['Below Range'];
  }
};
