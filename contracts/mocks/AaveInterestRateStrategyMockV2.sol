// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// interfaces
import "../interfaces/IAaveInterestRateStrategyV2.sol";

contract AaveInterestRateStrategyMockV2 is IAaveInterestRateStrategyV2 {
    uint256 public borrowRate;
    uint256 public supplyRate;

    function getBaseVariableBorrowRate() external view returns (uint256) {
        return borrowRate;
    }

    function calculateInterestRates(
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    )
        external
        view
        override
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (supplyRate, borrowRate, borrowRate);
    }

    // mocked methods
    function _setSupplyRate(uint256 _supplyRate) external {
        supplyRate = _supplyRate;
    }

    function _setBorrowRate(uint256 _borrowRate) external {
        borrowRate = _borrowRate;
    }
}
