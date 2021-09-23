// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/ILendingProtocol.sol";
// import "./interfaces/IMarginTradingNotifReceiver.sol";

// Aave interfaces
import "./interfaces/IAaveLendingPoolProviderV2.sol";
import "./interfaces/IAaveLendingPoolV2.sol";

/// @notice Aave wrapper which inherits ILendingProtocol interface.
contract AaveLendingProtocol is ILendingProtocol {
    using SafeERC20 for IERC20;

    IAaveLendingPoolProviderV2 public immutable aaveProvider;

    constructor(IAaveLendingPoolProviderV2 _provider) {
        aaveProvider = _provider;
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
    ) external override {
        uint256 amount = token.balanceOf(address(this));
        uint256 amountInWei = _convertDecimals(address(token), amount);
        IAaveLendingPoolV2 lendingPool = IAaveLendingPoolV2(aaveProvider.getLendingPool());

        token.safeApprove(address(lendingPool), amount);
        lendingPool.deposit(address(token), amountInWei, onBehalfOf, 0);
    }

    /// @notice Borrow tokens on behalf of `onBehalfOf` address . Only white listed caller can call this method.
    /// @dev Assume IDebtToken(debtTokenAddress).approveDelegation(borrower, amountInWei);
    /// @param token underlying token to deposit
    /// @param amount underlying token amounts
    /// @param onBehalfOf receiver of cToken
    /// @param data arbitrary data
    function borrow(
        IERC20 token,
        uint256 amount,
        address onBehalfOf,
        bytes memory data
    ) external override {
        uint256 interestRateMode = abi.decode(data, (uint256));
        uint256 amountInWei = _convertDecimals(address(token), amount);
        IAaveLendingPoolV2 lendingPool = IAaveLendingPoolV2(aaveProvider.getLendingPool());

        lendingPool.borrow(address(token), amountInWei, interestRateMode, 0, onBehalfOf);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    function _convertDecimals(address token, uint256 amount) internal view returns (uint256) {
        bytes memory result = Address.functionStaticCall(
            token,
            abi.encodeWithSignature("decimals()"),
            "call-token-dicimals-failed"
        );
        uint256 decimasls = uint256(abi.decode(result, (uint8)));
        if (decimasls < 18) {
            return (amount * 1e18) / 10**decimasls;
        } else {
            return amount / 10**(decimasls - 18);
        }
    }
}
