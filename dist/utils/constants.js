"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEE_RATE_DENOMINATOR = exports.MIN_SQRT_PRICE = exports.TICK_ARRAY_SIZE = exports.MAX_SQRT_PRICE = exports.MIN_TICK_INDEX = exports.MAX_TICK_INDEX = exports.ModuleConstants = void 0;
const bn_js_1 = __importDefault(require("bn.js"));
class ModuleConstants {
}
exports.ModuleConstants = ModuleConstants;
ModuleConstants.migrationPackageId = '0x54ed634a018904b66871bd30e9b9ccafcf9bfc192aa84c06b0931276c7afd22b';
ModuleConstants.suiCoinType = '0x2::sui::SUI';
ModuleConstants.CETUS_GLOBAL_CONFIG_ID = '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f';
ModuleConstants.functions = {
    swapX: 'swap_token_x',
    swapY: 'swap_token_y',
};
exports.MAX_TICK_INDEX = 443636;
exports.MIN_TICK_INDEX = -443636;
exports.MAX_SQRT_PRICE = '79226673515401279992447579055';
exports.TICK_ARRAY_SIZE = 64;
exports.MIN_SQRT_PRICE = '4295048016';
exports.FEE_RATE_DENOMINATOR = new bn_js_1.default(1000000);
