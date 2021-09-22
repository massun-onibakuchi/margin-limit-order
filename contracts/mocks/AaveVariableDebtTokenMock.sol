// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// interfaces
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AaveVariableDebtTokenMock is ERC20("VariableDaiDebt", "VariableDaiDebt") {
    uint256 public _scaledTotalSupply;

    mapping(address => mapping(address => uint256)) internal _borrowAllowances;

    function scaledTotalSupply() external view returns (uint256) {
        return _scaledTotalSupply;
    }

    /**
     * @dev delegates borrowing power to a user on the specific debt token
     * @param delegatee the address receiving the delegated borrowing power
     * @param amount the maximum amount being delegated. Delegation will still
     * respect the liquidation constraints (even if delegated, a delegatee cannot
     * force a delegator HF to go below 1)
     **/
    function approveDelegation(address delegatee, uint256 amount) external {
        _borrowAllowances[msg.sender][delegatee] = amount;
    }

    /**
     * @dev returns the borrow allowance of the user
     * @param fromUser The user to giving allowance
     * @param toUser The user to give allowance to
     * @return the current allowance of toUser
     **/
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256) {
        return _borrowAllowances[fromUser][toUser];
    }

    /**
     * @dev Mints debt token to the `onBehalfOf` address
     * -  Only callable by the LendingPool
     * @param user The address receiving the borrowed underlying, being the delegatee in case
     * of credit delegate, or same as `onBehalfOf` otherwise
     * @param onBehalfOf The address receiving the debt tokens
     * @param amount The amount of debt being minted
     * @param index The variable debt index of the reserve
     * @return `true` if the the previous balance of the user is 0
     **/
    function mint(
        address user,
        address onBehalfOf,
        uint256 amount,
        uint256 index
    ) external returns (bool) {
        if (user != onBehalfOf) {
            _decreaseBorrowAllowance(onBehalfOf, user, amount);
        }
        uint256 amountScaled = amount;

        _mint(onBehalfOf, amountScaled);
        return true;
    }

    function _decreaseBorrowAllowance(
        address delegator,
        address delegatee,
        uint256 amount
    ) internal {
        uint256 newAllowance = _borrowAllowances[delegator][delegatee] - amount;
        _borrowAllowances[delegator][delegatee] = newAllowance;
    }

    /*******************  NON TRANSFERRABLE  *********************/
    /**
     * @dev Being non transferrable, the debt token does not implement any of the
     * standard ERC20 functions for transfer and allowance.
     **/
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        recipient;
        amount;
        revert("TRANSFER_NOT_SUPPORTED");
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        owner;
        spender;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        spender;
        amount;
        revert("APPROVAL_NOT_SUPPORTED");
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        sender;
        recipient;
        amount;
        revert("TRANSFER_NOT_SUPPORTED");
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        spender;
        addedValue;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual override returns (bool) {
        spender;
        subtractedValue;
        revert("ALLOWANCE_NOT_SUPPORTED");
    }
}
