import hre, { waffle, ethers, deployments, getNamedAccounts } from "hardhat"
import { DeployFunction, DeployResult } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const aaveLendingProtocolDeployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { owner } = await getNamedAccounts()
    const signer = await ethers.getSigner(owner)

    const toWei = ethers.utils.parseEther

    const dai = await get("ERC20Mock")
    const weth = await get("WETH")
    const vault = await get("Vault")

    const options = { from: owner }
    const ADDRESS_ZERO = ethers.constants.AddressZero

    // const interestModel = await deploy("AaveInterestRateStrategyMockV2", options)
    const poolCore = await deploy("AaveLendingPoolCoreMock", options)
    const provider = await deploy("AaveLendingPoolProviderMock", { ...options })
    // tokens
    const variableDebt = await deploy("AaveVariableDebtTokenMock", { ...options })
    const aDai = await deploy("ADAIMock", { ...options, args: [dai.address] })
    const aWeth = await deploy("AWETHMock", { ...options, args: [weth.address] })
    // lending pool
    const pool = await deploy("AaveLendingPoolMockV2", {
        ...options,
        args: [
            [dai.address, weth.address],
            [aDai.address, aWeth.address],
            [ADDRESS_ZERO, ADDRESS_ZERO],
            [variableDebt.address, ADDRESS_ZERO],
        ],
    })

    await deploy("AaveLendingProtocol", { ...options, args: [vault.address, provider.address] })

    // Set Aave mock
    const providerContract = await ethers.getContractAt("AaveLendingPoolProviderMock", provider.address)
    await providerContract._setLendingPool(pool.address)
    await providerContract._setLendingPoolCore(poolCore.address)

    const aDaiContract = await ethers.getContractAt("ADAIMock", aDai.address)
    await aDaiContract.setLendingPool(pool.address)

    const aWethContract = await ethers.getContractAt("AWETHMock", aWeth.address)
    await aWethContract.setLendingPool(pool.address)

    const poolContract = await ethers.getContractAt("AaveLendingPoolMockV2", pool.address)
    // Deposit 10 dai to Aave
    const daiContract = await ethers.getContractAt("ERC20Mock", dai.address)
    await daiContract.mint(signer.address, toWei("10"))
    await daiContract.connect(signer).approve(pool.address, toWei("10"))
    await poolContract.connect(signer).deposit(dai.address, toWei("10"), signer.address, 0)

    // Deposit 10 WETH to Aave
    const wethConnect = await ethers.getContractAt("WETH", weth.address)
    await wethConnect.connect(signer).deposit({ value: toWei("10") })
    await wethConnect.connect(signer).approve(pool.address, toWei("10"))
    await poolContract.connect(signer).deposit(weth.address, toWei("10"), signer.address, 0)
}
export default aaveLendingProtocolDeployment
aaveLendingProtocolDeployment.tags = ["Aave"]
aaveLendingProtocolDeployment.dependencies = ["NotifReceiver"]
