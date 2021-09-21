// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IAaveLendingPoolV2.sol";
import "../interfaces/IAToken.sol";
import "./AaveStableDebtTokenMock.sol";
import "./AaveVariableDebtTokenMock.sol";

contract AaveLendingPoolMockV2 is IAaveLendingPoolV2 {
    address public interestRateStrategyAddress;
    uint128 public currentLiquidityRate;

    mapping(address => DataTypes.ReserveData) internal _assetReserveData;

    constructor(
        address[] memory uTokens,
        address[] memory aTokens,
        address[] memory stableDebtTokens,
        address[] memory variableDebtTokens
    ) {
        uint256 length = uTokens.length;
        require(
            length == aTokens.length && length == stableDebtTokens.length && length == variableDebtTokens.length,
            "invalid-constructor-args"
        );
        for (uint256 i = 0; i < length; i++) {
            _assetReserveData[uTokens[i]] = DataTypes.ReserveData({
                aTokenAddress: aTokens[i],
                stableDebtTokenAddress: stableDebtTokens[i],
                variableDebtTokenAddress: variableDebtTokens[i]
            });
        }
    }

    /**
     * @dev Deposits an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
     * - E.g. User deposits 100 USDC and gets in return 100 aUSDC
     * @param asset The address of the underlying asset to deposit
     * @param amount The amount to be deposited
     * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
     *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
     *   is a different wallet
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     **/
    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        IERC20(asset).transferFrom(msg.sender, _assetReserveData[asset].aTokenAddress, amount);
        IAToken(_assetReserveData[asset].aTokenAddress).mint(onBehalfOf, amount, 0);
    }

    function setStableDebtTokenAddress(address asset, address a) public {
        _assetReserveData[asset].stableDebtTokenAddress = a;
    }

    function setVariableDebtTokenAddress(address asset, address a) public {
        _assetReserveData[asset].variableDebtTokenAddress = a;
    }

    function setInterestRateStrategyAddress(address a) public {
        interestRateStrategyAddress = a;
    }

    function setCurrentLiquidityRate(uint128 v) public {
        currentLiquidityRate = v;
    }

    function withdraw(
        address _asset,
        uint256 _amount,
        address _to
    ) external override {
        IAToken(_assetReserveData[_asset].aTokenAddress).burn(msg.sender, _to, _amount, 0);
    }

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external override {
        address user = msg.sender;

        if (interestRateMode == 1) {
            AaveVariableDebtTokenMock(_assetReserveData[asset].variableDebtTokenAddress).mint(
                user,
                onBehalfOf,
                amount,
                0
            );
            // Pass check
            address assetToBorrow = _assetReserveData[asset].aTokenAddress;
            IAToken(assetToBorrow).transferUnderlyingTo(user, amount);
        } else if (interestRateMode == 0) {
            // AaveStableDebtTokenMock(_assetReserveData[asset].stableDebtTokenAddress)
        } else revert("aave-mock-borrow-failed");
    }

    function repay(
        address asset,
        uint256 amount,
        uint256 rateMode,
        address onBehalfOf
    ) external override {}
}

library DataTypes {
    // refer to the whitepaper, section 1.1 basic concepts for a formal description of these properties.
    struct ReserveData {
        // //stores the reserve configuration
        // ReserveConfigurationMap configuration;
        // //the liquidity index. Expressed in ray
        // uint128 liquidityIndex;
        // //variable borrow index. Expressed in ray
        // uint128 variableBorrowIndex;
        // //the current supply rate. Expressed in ray
        // uint128 currentLiquidityRate;
        // //the current variable borrow rate. Expressed in ray
        // uint128 currentVariableBorrowRate;
        // //the current stable borrow rate. Expressed in ray
        // uint128 currentStableBorrowRate;
        // uint40 lastUpdateTimestamp;
        //tokens addresses
        address aTokenAddress;
        address stableDebtTokenAddress;
        address variableDebtTokenAddress;
        // //address of the interest rate strategy
        // address interestRateStrategyAddress;
        // //the id of the reserve. Represents the position in the list of the active reserves
        // uint8 id;
    }

    struct ReserveConfigurationMap {
        //bit 0-15: LTV
        //bit 16-31: Liq. threshold
        //bit 32-47: Liq. bonus
        //bit 48-55: Decimals
        //bit 56: Reserve is active
        //bit 57: reserve is frozen
        //bit 58: borrowing is enabled
        //bit 59: stable rate borrowing enabled
        //bit 60-63: reserved
        //bit 64-79: reserve factor
        uint256 data;
    }

    struct UserConfigurationMap {
        uint256 data;
    }
}
