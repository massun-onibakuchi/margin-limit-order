// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./IMarginTradingNotifReceiver.sol";
import "./ILendingProtocol.sol";

interface IVault {
    function approvedReceiver(address notifReceiver) external view returns (bool);

    function deposit(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) external;

    function withdraw(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) external;

    function transferToReceiver(
        IERC20 token,
        address from,
        uint256 amount
    ) external;
}
