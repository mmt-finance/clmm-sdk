"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TickMath = void 0;
exports.convertI32ToSigned = convertI32ToSigned;
exports.convertSignedToI32 = convertSignedToI32;
exports.getTickDataFromUrlData = getTickDataFromUrlData;
exports.tickScore = tickScore;
/* eslint-disable no-bitwise */
const bn_js_1 = __importDefault(require("bn.js"));
const commonMath_1 = require("./commonMath");
const constants_1 = require("../constants");
const decimal_js_1 = __importDefault(require("decimal.js"));
const commonMath_2 = require("./commonMath");
const errors_1 = require("../../errors/errors");
const BIT_PRECISION = 14;
const LOG_B_2_X32 = '59543866431248';
const LOG_B_P_ERR_MARGIN_LOWER_X64 = '184467440737095516';
const LOG_B_P_ERR_MARGIN_UPPER_X64 = '15793534762490258745';
const TICK_BOUND = 443636;
function signedShiftLeft(n0, shiftBy, bitWidth) {
    const twosN0 = n0.toTwos(bitWidth).shln(shiftBy);
    twosN0.imaskn(bitWidth + 1);
    return twosN0.fromTwos(bitWidth);
}
function signedShiftRight(n0, shiftBy, bitWidth) {
    const twoN0 = n0.toTwos(bitWidth).shrn(shiftBy);
    twoN0.imaskn(bitWidth - shiftBy + 1);
    return twoN0.fromTwos(bitWidth - shiftBy);
}
function convertI32ToSigned(num) {
    // If the number is greater than the maximum positive value for a signed 32-bit integer,
    // interpret it as a negative number in two's complement form.
    if (num > 0x7fffffff) {
        return num - 0x100000000;
    }
    else {
        return num;
    }
}
function convertSignedToI32(num) {
    // Ensure the input is within the range of a signed 32-bit integer
    if (num < -2147483648 || num > 2147483647) {
        throw new RangeError('The number is out of range for a 32-bit signed integer.');
    }
    // Handle negative numbers using two's complement representation
    if (num < 0) {
        return 0x100000000 + num;
    }
    else {
        return num;
    }
}
function tickIndexToSqrtPricePositive(tick) {
    let ratio;
    if ((tick & 1) !== 0) {
        ratio = new bn_js_1.default('79232123823359799118286999567');
    }
    else {
        ratio = new bn_js_1.default('79228162514264337593543950336');
    }
    if ((tick & 2) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79236085330515764027303304731')), 96, 256);
    }
    if ((tick & 4) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79244008939048815603706035061')), 96, 256);
    }
    if ((tick & 8) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79259858533276714757314932305')), 96, 256);
    }
    if ((tick & 16) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79291567232598584799939703904')), 96, 256);
    }
    if ((tick & 32) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79355022692464371645785046466')), 96, 256);
    }
    if ((tick & 64) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79482085999252804386437311141')), 96, 256);
    }
    if ((tick & 128) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('79736823300114093921829183326')), 96, 256);
    }
    if ((tick & 256) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('80248749790819932309965073892')), 96, 256);
    }
    if ((tick & 512) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('81282483887344747381513967011')), 96, 256);
    }
    if ((tick & 1024) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('83390072131320151908154831281')), 96, 256);
    }
    if ((tick & 2048) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('87770609709833776024991924138')), 96, 256);
    }
    if ((tick & 4096) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('97234110755111693312479820773')), 96, 256);
    }
    if ((tick & 8192) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('119332217159966728226237229890')), 96, 256);
    }
    if ((tick & 16384) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('179736315981702064433883588727')), 96, 256);
    }
    if ((tick & 32768) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('407748233172238350107850275304')), 96, 256);
    }
    if ((tick & 65536) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('2098478828474011932436660412517')), 96, 256);
    }
    if ((tick & 131072) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('55581415166113811149459800483533')), 96, 256);
    }
    if ((tick & 262144) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('38992368544603139932233054999993551')), 96, 256);
    }
    return signedShiftRight(ratio, 32, 256);
}
function tickIndexToSqrtPriceNegative(tickIndex) {
    const tick = Math.abs(tickIndex);
    let ratio;
    if ((tick & 1) !== 0) {
        ratio = new bn_js_1.default('18445821805675392311');
    }
    else {
        ratio = new bn_js_1.default('18446744073709551616');
    }
    if ((tick & 2) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18444899583751176498')), 64, 256);
    }
    if ((tick & 4) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18443055278223354162')), 64, 256);
    }
    if ((tick & 8) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18439367220385604838')), 64, 256);
    }
    if ((tick & 16) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18431993317065449817')), 64, 256);
    }
    if ((tick & 32) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18417254355718160513')), 64, 256);
    }
    if ((tick & 64) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18387811781193591352')), 64, 256);
    }
    if ((tick & 128) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18329067761203520168')), 64, 256);
    }
    if ((tick & 256) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('18212142134806087854')), 64, 256);
    }
    if ((tick & 512) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('17980523815641551639')), 64, 256);
    }
    if ((tick & 1024) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('17526086738831147013')), 64, 256);
    }
    if ((tick & 2048) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('16651378430235024244')), 64, 256);
    }
    if ((tick & 4096) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('15030750278693429944')), 64, 256);
    }
    if ((tick & 8192) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('12247334978882834399')), 64, 256);
    }
    if ((tick & 16384) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('8131365268884726200')), 64, 256);
    }
    if ((tick & 32768) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('3584323654723342297')), 64, 256);
    }
    if ((tick & 65536) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('696457651847595233')), 64, 256);
    }
    if ((tick & 131072) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('26294789957452057')), 64, 256);
    }
    if ((tick & 262144) !== 0) {
        ratio = signedShiftRight(ratio.mul(new bn_js_1.default('37481735321082')), 64, 256);
    }
    return ratio;
}
class TickMath {
    static priceToSqrtPriceX64(price, decimalsA, decimalsB) {
        return commonMath_2.MathUtil.toX64(price.mul(decimal_js_1.default.pow(10, decimalsB - decimalsA)).sqrt());
    }
    static sqrtPriceX64ToPrice(sqrtPriceX64, decimalsA, decimalsB) {
        return commonMath_2.MathUtil.fromX64(sqrtPriceX64)
            .pow(2)
            .mul(decimal_js_1.default.pow(10, decimalsA - decimalsB));
    }
    static tickIndexToSqrtPriceX64(tickIndex) {
        if (tickIndex > 0) {
            return new bn_js_1.default(tickIndexToSqrtPricePositive(tickIndex));
        }
        return new bn_js_1.default(tickIndexToSqrtPriceNegative(tickIndex));
    }
    static sqrtPriceX64ToTickIndex(sqrtPriceX64) {
        if (sqrtPriceX64.gt(new bn_js_1.default(constants_1.MAX_SQRT_PRICE)) || sqrtPriceX64.lt(new bn_js_1.default(constants_1.MIN_SQRT_PRICE))) {
            throw new errors_1.ClmmpoolsError('Provided sqrtPrice is not within the supported sqrtPrice range.', errors_1.MathErrorCode.InvalidSqrtPrice);
        }
        const msb = sqrtPriceX64.bitLength() - 1;
        const adjustedMsb = new bn_js_1.default(msb - 64);
        const log2pIntegerX32 = signedShiftLeft(adjustedMsb, 32, 128);
        let bit = new bn_js_1.default('8000000000000000', 'hex');
        let precision = 0;
        let log2pFractionX64 = new bn_js_1.default(0);
        let r = msb >= 64 ? sqrtPriceX64.shrn(msb - 63) : sqrtPriceX64.shln(63 - msb);
        while (bit.gt(new bn_js_1.default(0)) && precision < BIT_PRECISION) {
            r = r.mul(r);
            const rMoreThanTwo = r.shrn(127);
            r = r.shrn(63 + rMoreThanTwo.toNumber());
            log2pFractionX64 = log2pFractionX64.add(bit.mul(rMoreThanTwo));
            bit = bit.shrn(1);
            precision += 1;
        }
        const log2pFractionX32 = log2pFractionX64.shrn(32);
        const log2pX32 = log2pIntegerX32.add(log2pFractionX32);
        const logbpX64 = log2pX32.mul(new bn_js_1.default(LOG_B_2_X32));
        const tickLow = signedShiftRight(logbpX64.sub(new bn_js_1.default(LOG_B_P_ERR_MARGIN_LOWER_X64)), 64, 128).toNumber();
        const tickHigh = signedShiftRight(logbpX64.add(new bn_js_1.default(LOG_B_P_ERR_MARGIN_UPPER_X64)), 64, 128).toNumber();
        if (tickLow === tickHigh) {
            return tickLow;
        }
        const derivedTickHighSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(tickHigh);
        if (derivedTickHighSqrtPriceX64.lte(sqrtPriceX64)) {
            return tickHigh;
        }
        return tickLow;
    }
    static tickIndexToPrice(tickIndex, decimalsA, decimalsB) {
        return TickMath.sqrtPriceX64ToPrice(TickMath.tickIndexToSqrtPriceX64(tickIndex), decimalsA, decimalsB);
    }
    static priceToTickIndex(price, decimalsA, decimalsB) {
        return TickMath.sqrtPriceX64ToTickIndex(TickMath.priceToSqrtPriceX64(price, decimalsA, decimalsB));
    }
    static priceToTickIndexWithTickSpacing(price, decimalsA, decimalsB, tickSpacing) {
        return TickMath.sqrtPriceX64ToTickIndexWithTickSpacing(TickMath.priceToSqrtPriceX64(price, decimalsA, decimalsB), tickSpacing);
    }
    static sqrtPriceX64ToTickIndexWithTickSpacing(sqrtPriceX64, tickSpacing) {
        if (sqrtPriceX64.gt(new bn_js_1.default(constants_1.MAX_SQRT_PRICE)) || sqrtPriceX64.lt(new bn_js_1.default(constants_1.MIN_SQRT_PRICE))) {
            throw new Error('Provided sqrtPrice is not within the supported sqrtPrice range.');
        }
        const msb = sqrtPriceX64.bitLength() - 1;
        const adjustedMsb = new bn_js_1.default(msb - 64);
        const log2pIntegerX32 = signedShiftLeft(adjustedMsb, 32, 128);
        let bit = new bn_js_1.default('8000000000000000', 'hex');
        let precision = 0;
        let log2pFractionX64 = new bn_js_1.default(0);
        let r = msb >= 64 ? sqrtPriceX64.shrn(msb - 63) : sqrtPriceX64.shln(63 - msb);
        while (bit.gt(new bn_js_1.default(0)) && precision < BIT_PRECISION) {
            r = r.mul(r);
            const rMoreThanTwo = r.shrn(127);
            r = r.shrn(63 + rMoreThanTwo.toNumber());
            log2pFractionX64 = log2pFractionX64.add(bit.mul(rMoreThanTwo));
            bit = bit.shrn(1);
            precision += 1;
        }
        const log2pFractionX32 = log2pFractionX64.shrn(32);
        const log2pX32 = log2pIntegerX32.add(log2pFractionX32);
        const logbpX64 = log2pX32.mul(new bn_js_1.default(LOG_B_2_X32));
        const tickLow = signedShiftRight(logbpX64.sub(new bn_js_1.default(LOG_B_P_ERR_MARGIN_LOWER_X64)), 64, 128).toNumber();
        const tickHigh = signedShiftRight(logbpX64.add(new bn_js_1.default(LOG_B_P_ERR_MARGIN_UPPER_X64)), 64, 128).toNumber();
        if (tickLow === tickHigh) {
            return convertSignedToI32(tickLow);
        }
        const derivedTickHighSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64WithTickSpacing(tickHigh, tickSpacing);
        if (derivedTickHighSqrtPriceX64.lte(sqrtPriceX64)) {
            return convertSignedToI32(tickHigh);
        }
        return convertSignedToI32(tickLow);
    }
    static tickIndexToSqrtPriceX64WithTickSpacing(tickIndex, tickSpacing, scaleUp) {
        const signedTick = convertI32ToSigned(scaleUp
            ? tickIndex + (tickIndex % (tickSpacing ?? 1))
            : tickIndex - (tickIndex % (tickSpacing ?? 1)));
        if (signedTick > 0) {
            return new bn_js_1.default(tickIndexToSqrtPricePositive(signedTick));
        }
        return new bn_js_1.default(tickIndexToSqrtPriceNegative(signedTick));
    }
    static priceToInitializableTickIndex(price, decimalsA, decimalsB, tickSpacing) {
        return TickMath.getInitializableTickIndex(TickMath.priceToTickIndex(price, decimalsA, decimalsB), tickSpacing);
    }
    static getInitializableTickIndex(tickIndex, tickSpacing) {
        return tickIndex - (tickIndex % tickSpacing);
    }
    /**
     *
     * @param tickIndex
     * @param tickSpacing
     * @returns
     */
    static getNextInitializableTickIndex(tickIndex, tickSpacing) {
        return TickMath.getInitializableTickIndex(tickIndex, tickSpacing) + tickSpacing;
    }
    static getPrevInitializableTickIndex(tickIndex, tickSpacing) {
        return TickMath.getInitializableTickIndex(tickIndex, tickSpacing) - tickSpacing;
    }
}
exports.TickMath = TickMath;
function getTickDataFromUrlData(ticks) {
    const tickdatas = [];
    for (const tick of ticks) {
        const td = {
            objectId: tick.objectId,
            index: Number((0, commonMath_1.asIntN)(BigInt(tick.index)).toString()),
            sqrtPrice: tick.sqrtPrice,
            liquidityNet: new bn_js_1.default(BigInt.asIntN(128, BigInt(BigInt(tick.liquidityNet.toString()))).toString()),
            liquidityGross: tick.liquidityGross,
            feeGrowthOutsideA: tick.feeGrowthOutsideA,
            feeGrowthOutsideB: tick.feeGrowthOutsideB,
            rewardersGrowthOutside: [
                new bn_js_1.default(tick.rewardersGrowthOutside[0]),
                new bn_js_1.default(tick.rewardersGrowthOutside[1]),
                new bn_js_1.default(tick.rewardersGrowthOutside[2]),
            ],
        };
        tickdatas.push(td);
    }
    return tickdatas;
}
function tickScore(tickIndex) {
    return (0, commonMath_1.d)(tickIndex).add((0, commonMath_1.d)(TICK_BOUND));
}
