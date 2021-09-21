// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "./ATokenMock.sol";

contract AWETHMock is ATokenMock {
    constructor(address _uToken) ATokenMock(_uToken, "aWETH", "aWETH") {}
}
