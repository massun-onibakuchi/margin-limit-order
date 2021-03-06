import { Contract } from "ethers"
import hre, { ethers, deployments, getNamedAccounts } from "hardhat"

export const setupTest = deployments.createFixture(async ({ deployments, getNamedAccounts, ethers }, options) => {
    await deployments.fixture(["Aave"]) // ensure you start from a fresh deployments
    const { owner, wallet } = await getNamedAccounts()
    const deployer = await ethers.getSigner(owner)

    const deployedContracts: { [name: string]: Contract } = {}
    const deploymentResults = await deployments.all()
    for (const [name, result] of Object.entries(deploymentResults)) {
        deployedContracts[name] = await ethers.getContractAt(name, result.address, deployer)
    }
    const notifReceiver = deployedContracts["MarginTradingNotifReceiver"]

    await deployedContracts["FactoryClone"].addLendingProtocol(deployedContracts["AaveLendingProtocol"].address)

    await deployedContracts["ERC20Mock"].mint(wallet, ethers.utils.parseEther("1"))
    await deployedContracts["WETH"]
        .connect(await ethers.getSigner(wallet))
        .deposit({ value: ethers.utils.parseEther("1") })

    return deployedContracts
})
