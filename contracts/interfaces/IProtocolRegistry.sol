// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IProtocolRegistry {
    function addLendingProtocol(address _lendingProtocol) external;
}
