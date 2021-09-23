// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IFactoryClone.sol";
import "./interfaces/IMarginTradingNotifReceiver.sol";
import "./interfaces/IWETH.sol";

contract FactoryClone is IFactoryClone, Ownable {
    IERC20 public immutable override wethToken;

    address public immutable override limitOrderProtocol;
    address public immutable override implementation;

    address[] public deployedContracts;

    mapping(address => bool) public override lendingProtocols;

    constructor(
        address _limitOrderProtocol,
        address _implementation,
        IERC20 _wethToken
    ) {
        limitOrderProtocol = _limitOrderProtocol;
        implementation = _implementation;
        wethToken = _wethToken;
    }

    function addLendingProtocol(address _lendingProtocol) external onlyOwner {
        lendingProtocols[_lendingProtocol] = true;
    }

    function deploy() external override returns (address clone) {
        clone = Clones.clone(implementation);
        deployedContracts.push(clone);
        IMarginTradingNotifReceiver notifReceiver = IMarginTradingNotifReceiver(clone);
        notifReceiver.initialize(limitOrderProtocol, wethToken);
        notifReceiver.transferOwnership(msg.sender);
    }
}
