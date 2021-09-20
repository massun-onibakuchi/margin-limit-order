// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../limit-order-protocol/interfaces/InteractiveNotificationReceiver.sol";
import "./ILendingProtocol.sol";

interface IMarginTradingNotifReceiver is InteractiveNotificationReceiver {
    struct MarginOrderData {
        ILendingProtocol lendingPool;
        address wallet;
        uint256 initialLeverage;
        uint256 amtToLend;
        uint256 amtToBorrow;
        bool useVault;
        bytes data;
    }

    function deposit(IERC20 token, uint256 amount) external;

    function withdraw(IERC20 token, uint256 amount) external;

    function addLendingProtocol(address _lendingProtocol) external;
}
