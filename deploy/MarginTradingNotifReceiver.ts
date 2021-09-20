import hre, { waffle, ethers, deployments, getNamedAccounts } from "hardhat"
import { DeployFunction, DeployResult } from "hardhat-deploy/dist/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const notifReceiverDeployment: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { deployments, getNamedAccounts } = hre
    const { deploy, get } = deployments
    const { owner } = await getNamedAccounts()

    const limitOrderProtocol = await get("LimitOrderProtocol")

    const options = { from: owner }
    const weth = await deploy("WETH", options)
    const token0 = await deploy("ERC20Mock", { ...options, args: ["Dai Stable Coin", "DAI"] })

    const vault = await deploy("Vault", { ...options, args: [limitOrderProtocol.address, weth.address] })
    const notifReceiver = await deploy("MarginTradingNotifReceiver", {
        ...options,
        args: [vault.address, limitOrderProtocol.address],
    })
}
export default notifReceiverDeployment
notifReceiverDeployment.tags = ["NotifReceiver"]
notifReceiverDeployment.dependencies = ["LimitOrderProtocol"]
