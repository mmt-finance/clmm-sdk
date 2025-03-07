"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPositionStatus = void 0;
const types_1 = require("../types");
const getPositionStatus = (currentSqrtPrice, lowerSqrtPrice, upperSqrtPrice) => {
    if (currentSqrtPrice < lowerSqrtPrice) {
        return types_1.PositionStatus['Above Range'];
    }
    else if (currentSqrtPrice <= upperSqrtPrice && currentSqrtPrice >= lowerSqrtPrice) {
        return types_1.PositionStatus['In Range'];
    }
    else if (currentSqrtPrice > upperSqrtPrice) {
        return types_1.PositionStatus['Below Range'];
    }
};
exports.getPositionStatus = getPositionStatus;
