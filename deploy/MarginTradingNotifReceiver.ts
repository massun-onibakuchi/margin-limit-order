import hre, { waffle, ethers, deployments, getNamedAccounts } from "hardhat"
import { DeployFunction, DeployResult } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const notifReceiverDeployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { owner } = await getNamedAccounts()

    const weth = await get("WETH")
    const limitOrderProtocol = await get("LimitOrderProtocol")

    const options = { from: owner }

    const implementation = await deploy("MarginTradingNotifReceiver", {
        ...options,
    })

    const factory = await deploy("FactoryClone", {
        ...options,
        args: [limitOrderProtocol.address, implementation.address, weth.address],
    })
}
export default notifReceiverDeployment
notifReceiverDeployment.tags = ["NotifReceiver"]
notifReceiverDeployment.dependencies = ["LimitOrderProtocol" /* "MockToken" */]
