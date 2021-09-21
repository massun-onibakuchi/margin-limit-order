// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// interfaces
import "../interfaces/IAaveLendingPoolProvider.sol";

contract AaveLendingPoolProviderMock is IAaveLendingPoolProvider {
    address public pool;
    address public core;

    function getLendingPool() external view override returns (address) {
        return pool;
    }

    function getLendingPoolCore() external view override returns (address) {
        return core;
    }

    // mocked methods
    function _setLendingPool(address _pool) external {
        pool = _pool;
    }

    function _setLendingPoolCore(address _core) external {
        core = _core;
    }
}
