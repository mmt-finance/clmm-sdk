import Decimal from 'decimal.js';

export class DecimalUtils {
  static toBeCloseToDecimal(
    received: Decimal,
    expected: Decimal,
    tolerance: Decimal = new Decimal(0.0001),
  ) {
    const diff = received.sub(expected).abs();
    const maxAllowedDiff = expected.abs().mul(tolerance);
    if (received.eq(0) || expected.eq(0)) {
      return diff.lte(0.0001);
    }
    return diff.lte(maxAllowedDiff);
  }
}
