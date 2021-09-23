import { Signer } from "ethers"
import { ethers, getNamedAccounts } from "hardhat"

export const deployClone = async (factory, signer?: Signer) => {
    const { wallet } = await getNamedAccounts()
    const deployer = signer || (await ethers.getSigner(wallet))

    const clone = await factory.connect(deployer).deploy()
    const notifReceiver = await ethers.getContractAt("MarginTradingNotifReceiver", await factory.deployedContracts(0))

    return notifReceiver
}
