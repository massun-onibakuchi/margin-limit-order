import { ethers, getNamedAccounts } from "hardhat"
import { Contract, ContractTransaction, Signer } from "ethers"
import { FactoryClone } from "../../typechain"
import { LogDescription } from "@ethersproject/abi"

export const deployClone = async (factory: FactoryClone, signer?: Signer) => {
    const { wallet } = await getNamedAccounts()
    const deployer = signer || (await ethers.getSigner(wallet))

    const tx = await factory.connect(deployer).deploy()
    const { clone } = (await findEmittedEvent(factory, tx, "Deploy")).args
    const notifReceiver = await ethers.getContractAt("MarginTradingNotifReceiver", clone)
    return notifReceiver
}

const findEmittedEvent = async (
    contract: Contract,
    tx: ContractTransaction,
    eventName: string,
): Promise<LogDescription> => {
    return (await getEvents(contract, tx)).find(e => e.name === eventName)
}
const getEvents = async (contract: Contract, tx: ContractTransaction): Promise<LogDescription[]> => {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
    return receipt.logs.reduce((parsedEvents, log) => {
        try {
            parsedEvents.push(contract.interface.parseLog(log))
        } catch (e) {}
        return parsedEvents
    }, [])
}
