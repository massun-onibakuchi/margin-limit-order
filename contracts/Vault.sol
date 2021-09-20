// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IVault.sol";
import "./interfaces/IProtocolRegistry.sol";
import "./interfaces/IWETH.sol";

abstract contract BaseVault is IVault {
    using SafeERC20 for IERC20;

    IERC20 private constant USE_ETHEREUM = IERC20(address(0));
    IERC20 public immutable wethToken;

    mapping(address => bool) public override approvedReceiver;

    /// @dev Balance per token per address/contract in shares
    mapping(IERC20 => mapping(address => uint256)) public balanceOf;

    constructor(IERC20 _wethToken) {
        wethToken = _wethToken;
    }

    function deposit(
        IERC20 token_,
        address from,
        address to,
        uint256 amount
    ) public override allowed(from) {
        // Checks
        require(to != address(0), "to-not-set");
        require(from != address(this), "invalid-src-address");
        _deposit(token_, from, to, amount);
    }

    function _deposit(
        IERC20 token_,
        address from,
        address to,
        uint256 amount
    ) internal {
        // Effects
        IERC20 token = _toERC20(token_);
        balanceOf[token][to] += amount;

        // Interactions
        if (token_ == USE_ETHEREUM) {
            IWETH(address(wethToken)).deposit{ value: amount }();
        } else if (from != address(this)) {
            token.safeTransferFrom(from, address(this), amount);
        }
    }

    function withdraw(
        IERC20 token_,
        address from,
        address to,
        uint256 amount
    ) public override allowed(from) {
        require(to != address(0), "to-not-set");
        _withdraw(token_, from, to, amount);
    }

    function _withdraw(
        IERC20 token_,
        address from,
        address to,
        uint256 amount
    ) internal {
        // Effects
        IERC20 token = _toERC20(token_);
        balanceOf[token][from] -= amount;

        // Interactions
        if (token_ == USE_ETHEREUM) {
            IWETH(address(wethToken)).withdraw(amount);
            // solhint-disable-next-line
            (bool success, ) = to.call{ value: amount }("");
            require(success, "eth-transfer-failed");
        } else {
            token.safeTransfer(to, amount);
        }
    }

    function transfer(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) public allowed(from) {
        // Checks
        require(to != address(0), "to-not-set");

        // Effects
        balanceOf[token][from] -= amount;
        balanceOf[token][to] += amount;
    }

    function _toERC20(IERC20 token_) internal view returns (IERC20) {
        return token_ == USE_ETHEREUM ? wethToken : token_;
    }

    /// Modifier to check if the msg.sender is allowed to use funds belonging to the 'from' address.
    /// If 'from' is msg.sender, it's allowed.
    /// If 'from' is a white listed Notif Receiver, it's allowed.'
    modifier allowed(address from) {
        require(from == msg.sender || approvedReceiver[msg.sender], "transfer-not-approved");
        _;
    }

    receive() external payable {}
}

contract Vault is Ownable, BaseVault {
    address public immutable limitOrderProtocol;

    constructor(address _limitOrderProtocol, IERC20 _wethToken) BaseVault(_wethToken) {
        limitOrderProtocol = _limitOrderProtocol;
    }

    function transferToReceiver(
        IERC20 token,
        address from,
        uint256 amount
    ) external override {
        require(approvedReceiver[msg.sender], "not-approved-caller");
        _withdraw(token, from, msg.sender, amount);
    }

    function addReceiver(address notifReceiver) external onlyOwner {
        approvedReceiver[notifReceiver] = true;
    }

    function addLendingProtocol(address _notifReceiver, address _lendingProtocol) external onlyOwner {
        require(approvedReceiver[_notifReceiver], "not-approved-receiver");
        IProtocolRegistry(_notifReceiver).addLendingProtocol(_lendingProtocol);
    }
}
