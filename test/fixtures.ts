import { Contract } from "ethers"
import hre, { ethers, deployments, getNamedAccounts } from "hardhat"

export const setupTest = deployments.createFixture(async ({ deployments, getNamedAccounts, ethers }, options) => {
    await deployments.fixture() // ensure you start from a fresh deployments
    const { owner } = await getNamedAccounts()
    const signer = await ethers.getSigner(owner)

    const deployedContracts: { [name: string]: Contract } = {}
    const deploymentResults = await deployments.all()
    for (const [name, result] of Object.entries(deploymentResults)) {
        deployedContracts[name] = await ethers.getContractAt(name, result.address, signer)
    }
    const notifReceiver = deployedContracts["MarginTradingNotifReceiver"]

    await deployedContracts["Vault"].addReceiver(notifReceiver.address)
    await deployedContracts["Vault"].addLendingProtocol(
        notifReceiver.address,
        deployedContracts["AaveLendingProtocol"].address,
    )
    return deployedContracts
})
