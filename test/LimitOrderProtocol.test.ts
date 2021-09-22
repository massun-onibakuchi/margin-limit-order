import { deployments, ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { Contract } from "ethers"
import { LimitOrderProtocol, InteractiveNotificationReceiverMock, ERC20Mock, WETH } from "../typechain"
import { buildOrder } from "./helpers/order"
import { buildOrderData } from "./helpers/utils"

use(require("chai-bignumber")())
const toWei = ethers.utils.parseEther
const zeroAddress = ethers.constants.AddressZero

describe("LimitOrderProtocol", async function () {
    const { chainId } = await ethers.provider.getNetwork()
    let dai: ERC20Mock
    let weth: WETH
    let swap: LimitOrderProtocol
    let notificationReceiver: InteractiveNotificationReceiverMock
    const { wallet, taker: takerAddr } = await getNamedAccounts()
    const signer = await ethers.getSigner(wallet) // maker
    const taker = await ethers.getSigner(takerAddr)
    const deployedContracts: { [name: string]: Contract } = {}

    beforeEach(async function () {
        const { owner } = await getNamedAccounts()
        const deployer = await ethers.getSigner(owner)
        const results = await deployments.fixture(["LimitOrderProtocol"])
        for (const [name, result] of Object.entries(results)) {
            deployedContracts[name] = await ethers.getContractAt(name, result.address, deployer)
        }
        ;({
            LimitOrderProtocol: swap,
            ERC20Mock: dai,
            WETH: weth,
            InteractiveNotificationReceiverMock: notificationReceiver,
        } = deployedContracts as any)

        await dai.mint(signer.address, toWei("1"))
        await dai.mint(taker.address, toWei("1"))
        await weth.connect(signer).deposit({ value: toWei("1") })
        await weth.connect(taker).deposit({ value: toWei("1") })

        await dai.connect(signer).approve(swap.address, toWei("1"))
        await weth.connect(signer).approve(swap.address, toWei("1"))
        await dai.connect(taker).approve(swap.address, toWei("1"))
        await weth.connect(taker).approve(swap.address, toWei("1"))
    })

    it("Interaction - should fill and unwrap token", async function () {
        // signer who is a maker would sell his DAI to buy WETH

        const interaction = notificationReceiver.address + wallet.substr(2)

        const order = buildOrder(
            swap,
            dai, // Asset which maker want to sell
            weth, // Asset which maker want to buy
            1, // makerAsset
            1, // takerAsset
            signer.address, // maker
            zeroAddress,
            swap.interface.encodeFunctionData("timestampBelow", [0xff00000000]),
            "0x",
            interaction,
            notificationReceiver.address, // CustomReceiver
        )
        const data = buildOrderData(chainId, swap.address, order)
        const signature = await signer._signTypedData(data.domain, { Order: data.types.Order }, data.message)

        const signerDai = await dai.balanceOf(signer.address)
        const takerDai = await dai.balanceOf(taker.address)
        const signerWeth = await weth.balanceOf(signer.address)
        const takerWeth = await weth.balanceOf(taker.address)
        const signerEth = await ethers.provider.getBalance(signer.address)

        // unwrap WETH which maker would buy and send
        await swap
            .connect(taker)
            .fillOrder(order, signature, 1 /* makingAmount */, 0 /* takingAmount */, 1 /* thresholdAmount */)

        expect(await ethers.provider.getBalance(signer.address)).to.equal(signerEth.add(1))
        expect(await dai.balanceOf(signer.address)).to.equal(signerDai.sub(1))
        expect(await dai.balanceOf(taker.address)).to.equal(takerDai.add(1))
        expect(await weth.balanceOf(signer.address)).to.equal(signerWeth)
        expect(await weth.balanceOf(taker.address)).to.equal(takerWeth.sub(1))
    })
})
