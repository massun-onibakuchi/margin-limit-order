// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./limit-order-protocol/interfaces/InteractiveNotificationReceiver.sol";
import "./interfaces/IMarginTradingNotifReceiver.sol";
import "./interfaces/ILendingProtocol.sol";
import "./interfaces/IVault.sol";

contract MarginTradingNotifReceiver is IMarginTradingNotifReceiver {
    using SafeERC20 for IERC20;

    address public immutable vault;
    address public immutable limitOrderProtocol;

    mapping(address => bool) public lendingProtocols;

    constructor(address _vault, address _limitOrderProtocol) {
        vault = _vault;
        limitOrderProtocol = _limitOrderProtocol;
    }

    function deposit(IERC20 token, uint256 amount) external override {
        IVault(vault).deposit(token, msg.sender, msg.sender, amount);
    }

    function withdraw(IERC20 token, uint256 amount) external override {
        IVault(vault).withdraw(token, msg.sender, msg.sender, amount);
    }

    function notifyFillOrder(
        address taker,
        address makerAsset,
        address takerAsset,
        uint256 makingAmount,
        uint256 takingAmount,
        bytes memory interactiveData
    ) external override {
        require(msg.sender == limitOrderProtocol, "only-limit-order-protocol");

        MarginOrderData memory marginOrderData = abi.decode(interactiveData, (MarginOrderData));
        ILendingProtocol pool = marginOrderData.lendingPool;

        require(lendingProtocols[address(pool)], "not-approved-lending-protocol");
        require(
            marginOrderData.amtToLend >= takingAmount || makingAmount >= marginOrderData.amtToBorrow,
            "invalid-amount"
        );

        // Deposit collateral which maker buy and then borrow asset which maker would sell
        _lend(
            pool,
            takerAsset,
            marginOrderData.wallet,
            marginOrderData.amtToLend,
            takingAmount,
            marginOrderData.useVault,
            marginOrderData.data
        );
        _borrow(
            pool,
            makerAsset,
            marginOrderData.wallet,
            marginOrderData.amtToBorrow,
            makingAmount,
            marginOrderData.useVault,
            marginOrderData.data
        );

        // Transfer borrowed asset to wallet address.
        uint256 amtToSell = IERC20(makerAsset).balanceOf(address(this));
        require(amtToSell >= marginOrderData.amtToBorrow, "inconsistent-balance");
        IERC20(makerAsset).safeTransfer(marginOrderData.wallet, amtToSell);
    }

    /// @param pool lending protocols
    /// @param takerAsset taker asset i.e. asset which maker account bought
    /// @param onBehalfOf debt being incurred by `onBehalfOf`
    /// @param amtToLend amount to deposit to lending protocol
    /// @param takingAmount amounts of taker asset
    /// @param data arbitrary data
    function _lend(
        ILendingProtocol pool,
        address takerAsset,
        address onBehalfOf,
        uint256 amtToLend,
        uint256 takingAmount,
        bool useVault,
        bytes memory data
    ) internal {
        // require(amtToLend >= takingAmount, "making-amount-gt-amount-to-lend");
        uint256 amtToPull = amtToLend - takingAmount;
        if (amtToPull > 0) {
            if (useVault) {
                IVault(vault).transferToReceiver(IERC20(takerAsset), onBehalfOf, amtToPull);
            } else {
                IERC20(takerAsset).safeTransferFrom(onBehalfOf, address(this), amtToPull);
            }
        }
        // uint256 depositBalance = takingAmount + IERC20(takerAsset).balanceOf(address(this));
        // require(depositBalance >= amtToLend, "short-of-amt-to-lend");

        // IERC20(takerAsset).transfer(address(pool), depositBalance);
        IERC20(takerAsset).transfer(address(pool), amtToLend);
        pool.lend(IERC20(takerAsset), onBehalfOf, data);
    }

    /// @dev Assume that IDebtToken(debtTokenAddress).approveDelegation(borrower, amountInWei);
    /// @param pool lending protocols
    /// @param makerAsset maker asset i.e. asset which maker account sold
    /// @param onBehalfOf debt being incurred by `onBehalfOf`
    /// @param amtToBorrow amounts to borrow which is less than `makingAmount`
    /// @param makingAmount amounts of maker asset
    /// @param data arbitrary data
    function _borrow(
        ILendingProtocol pool,
        address makerAsset,
        address onBehalfOf,
        uint256 amtToBorrow,
        uint256 makingAmount,
        bool useVault,
        bytes memory data
    ) internal {
        uint256 amtToPull = makingAmount - amtToBorrow;
        if (amtToPull > 0) {
            if (useVault) {
                IVault(vault).transferToReceiver(IERC20(makerAsset), onBehalfOf, amtToPull);
            } else {
                IERC20(makerAsset).safeTransferFrom(onBehalfOf, address(this), amtToPull);
            }
        }

        pool.borrow(IERC20(makerAsset), amtToBorrow, onBehalfOf, data);
    }

    function _approveERC20(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).safeApprove(spender, 0);
        IERC20(token).safeApprove(spender, amount);
    }

    function addLendingProtocol(address _lendingProtocol) external override {
        require(msg.sender == vault, "only-vault");
        lendingProtocols[_lendingProtocol] = true;
    }
}
