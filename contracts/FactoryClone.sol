// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IFactoryClone.sol";
import "./interfaces/IMarginTradingNotifReceiver.sol";
import "./interfaces/IWETH.sol";

contract FactoryClone is IFactoryClone, Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    IERC20 public immutable override wethToken;

    address public immutable override limitOrderProtocol;
    address public immutable override implementation;

    EnumerableSet.AddressSet internal _notifReceivers;

    mapping(address => bool) public override lendingProtocols;

    event Deploy(address indexed clone, address indexed caller);

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

        emit Deploy(clone, msg.sender);

        _notifReceivers.add(clone);
        IMarginTradingNotifReceiver notifReceiver = IMarginTradingNotifReceiver(clone);
        notifReceiver.initialize(limitOrderProtocol, wethToken);
        notifReceiver.transferOwnership(msg.sender);
    }

    function isRegistered(address _notifReceiver) public view override returns (bool) {
        return _notifReceivers.contains(_notifReceiver);
    }

    function getDeployedContract(uint256 index) public view override returns (address) {
        return _notifReceivers.at(index);
    }

    function deployedContracts() external view returns (address[] memory) {
        return _notifReceivers.values();
    }
}
