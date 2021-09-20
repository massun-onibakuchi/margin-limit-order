// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./limit-order-protocol/interfaces/InteractiveNotificationReceiver.sol";
import "./interfaces/IMarginTradingNotifReceiver.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ILendingProtocol.sol";
import "./interfaces/IAaveLendingPoolProviderV2.sol";
import "./interfaces/IAaveLendingPoolV2.sol";

contract AaveLendingProtocol is ILendingProtocol {
    using SafeERC20 for IERC20;

    address public immutable vault;

    IAaveLendingPoolProviderV2 public immutable provider;

    constructor(address _vault, IAaveLendingPoolProviderV2 _provider) {
        vault = _vault;
        provider = _provider;
    }

    /// @notice Deposit `token` to a Lending protocol. Only white listed caller can call this method.
    /// @dev Assume that amounts to deposit are transfered to this contract.
    /// @param token underlying token to deposit
    /// @param onBehalfOf receiver of cToken
    /// @param data arbitrary data
    function lend(
        IERC20 token,
        address onBehalfOf,
        bytes memory data
    ) external override onlyApprovedCaller {
        uint256 amount = token.balanceOf(address(this));
        uint256 amountInWei;
        AaveLendingPoolV2 lendingPool = AaveLendingPoolV2(provider.getLendingPool());

        token.safeApprove(address(lendingPool), amount);
        lendingPool.deposit(address(token), amountInWei, onBehalfOf, 0);
    }

    /// @notice Borrow tokens on behalf of `onBehalfOf` address . Only white listed caller can call this method.
    /// @dev Sssume IDebtToken(debtTokenAddress).approveDelegation(borrower, amountInWei);
    /// @param token underlying token to deposit
    /// @param amount underlying token amounts
    /// @param onBehalfOf receiver of cToken
    /// @param data arbitrary data
    function borrow(
        IERC20 token,
        uint256 amount,
        address onBehalfOf,
        bytes memory data
    ) external override onlyApprovedCaller {
        uint256 interestRateMode = abi.decode(data, (uint256));
        uint256 amountInWei = amount;
        AaveLendingPoolV2 lendingPool = AaveLendingPoolV2(provider.getLendingPool());

        lendingPool.borrow(address(token), amountInWei, interestRateMode, 0, onBehalfOf);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    modifier onlyApprovedCaller() {
        require(IVault(vault).approvedReceiver(msg.sender), "only-approved-caller");
        _;
    }
}
