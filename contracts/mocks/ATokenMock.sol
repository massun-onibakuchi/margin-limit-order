// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// interfaces
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IAToken.sol";

abstract contract ATokenMock is IAToken, ERC20 {
    address public uToken;
    address public controller;
    uint256 public price = 10**18;
    address public lendingPool;

    constructor(
        address _uToken,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        uToken = _uToken;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return uToken;
    }

    function redeem(uint256 amount) external override {
        _burn(msg.sender, amount);
        require(IERC20(uToken).transfer(msg.sender, amount), "Error during transfer"); // 1 DAI
    }

    function setPriceForTest(uint256 _price) external {
        price = _price;
    }

    function setController(address _controller) external {
        controller = _controller;
    }

    function setLendingPool(address _lendingPool) external {
        lendingPool = _lendingPool;
    }

    function mint(
        address user,
        uint256 amount,
        uint256 index
    ) external override onlyLendingPool {
        uint256 amountScaled = amount;
        _mint(user, amountScaled);
    }

    function burn(
        address user,
        address receiverOfUnderlying,
        uint256 amount,
        uint256 index
    ) external override onlyLendingPool {
        _burn(user, amount);
        require(IERC20(uToken).transfer(receiverOfUnderlying, amount), "Error during transfer");
    }

    /**
     * @dev Transfers the underlying asset to `target`. Used by the LendingPool to transfer
     * assets in borrow(), withdraw() and flashLoan()
     * @param user The recipient of the aTokens
     * @param amount The amount getting transferred
     * @return The amount transferred
     **/
    function transferUnderlyingTo(address user, uint256 amount) external override onlyLendingPool returns (uint256) {
        require(IERC20(uToken).transfer(user, amount), "Error during transfer");
        return amount;
    }

    function getIncentivesController() external view override returns (address) {
        return controller;
    }

    modifier onlyLendingPool() {
        require(msg.sender == lendingPool, "only-lending-pool");
        _;
    }
}
