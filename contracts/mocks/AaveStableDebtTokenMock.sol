// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

contract AaveStableDebtTokenMock {
    uint256 public totalStableDebt;
    uint256 public avgStableRate;

    constructor(uint256 debt, uint256 rate) {
        totalStableDebt = debt;
        avgStableRate = rate;
    }

    function getTotalSupplyAndAvgRate() external view returns (uint256, uint256) {
        return (totalStableDebt, avgStableRate);
    }
}
