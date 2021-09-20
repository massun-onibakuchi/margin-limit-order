import { deployments, ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { Contract } from "ethers"
import { WrappedTokenMock, TokenMock, LimitOrderProtocol, InteractiveNotificationReceiverMock } from "../typechain"
import { buildOrderData, cutLastArg } from "./helpers/utils"

use(require("chai-bignumber")())
const toWei = ethers.utils.parseEther

describe("LimitOrderProtocol", async function () {
    const privatekey = "59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    const account = new ethers.Wallet(Buffer.from(privatekey, "hex"))

    const zeroAddress = ethers.constants.AddressZero

    function buildOrder(
        exchange,
        makerAsset,
        takerAsset,
        makerAmount,
        takerAmount,
        taker = zeroAddress,
        predicate = "0x",
        permit = "0x",
        interaction = "0x",
        customReciever,
    ) {
        return buildOrderWithSalt(
            exchange,
            "1",
            makerAsset,
            takerAsset,
            makerAmount,
            takerAmount,
            taker,
            predicate,
            permit,
            interaction,
            customReciever,
        )
    }

    function buildOrderWithSalt(
        exchange,
        salt,
        makerAsset,
        takerAsset,
        makerAmount,
        takerAmount,
        taker = zeroAddress,
        predicate = "0x",
        permit = "0x",
        interaction = "0x",
        customReciever,
    ) {
        const receiver = customReciever === undefined ? wallet : customReciever
        return {
            salt: salt,
            makerAsset: makerAsset.address,
            takerAsset: takerAsset.address,
            makerAssetData: makerAsset.contract.methods.transferFrom(wallet, taker, makerAmount).encodeABI(),
            takerAssetData: takerAsset.contract.methods.transferFrom(taker, receiver, takerAmount).encodeABI(),
            getMakerAmount: cutLastArg(
                exchange.contract.methods.getMakerAmount(makerAmount, takerAmount, 0).encodeABI(),
            ),
            getTakerAmount: cutLastArg(
                exchange.contract.methods.getTakerAmount(makerAmount, takerAmount, 0).encodeABI(),
            ),
            predicate: predicate,
            permit: permit,
            interaction: interaction,
        }
    }

    let chainId
    let dai: TokenMock
    let weth: WrappedTokenMock
    let swap: LimitOrderProtocol
    let notificationReceiver: InteractiveNotificationReceiverMock
    const { wallet, receiver } = await getNamedAccounts()
    const signer = await ethers.getSigner(wallet)

    beforeEach(async function () {
        const deployedContracts: { [name: string]: Contract } = {}
        const results = await deployments.fixture(["LimitOrderProtocol"])
        for (const [name, result] of Object.entries(results)) {
            deployedContracts[name] = await ethers.getContractAt(name, result.address, signer)
        }
        ;({
            LimitOrderProtocol: swap,
            TokenMock: dai,
            WrappedTokenMock: weth,
            InteractiveNotificationReceiverMock: notificationReceiver,
        } = deployedContracts as any)

        // We get the chain id from the contract because Ganache (used for coverage) does not return the same chain id
        // from within the EVM as from the JSON RPC interface.
        // See https://github.com/trufflesuite/ganache-core/issues/515
        chainId = await dai.getChainId()

        await dai.mint(wallet, "1000000")
        await weth.mint(wallet, "1000000")
        await dai.mint(receiver, "1000000")
        await weth.mint(receiver, "1000000")

        await dai.approve(swap.address, "1000000")
        await weth.approve(swap.address, "1000000")
        await dai.approve(swap.address, "1000000", { from: wallet })
        await weth.approve(swap.address, "1000000", { from: wallet })
    })

    describe("Interaction", async function () {
        it("should fill and unwrap token", async function () {
            const amount = toWei("1")
            await signer.sendTransaction({ to: weth.address, value: amount })

            const interaction = notificationReceiver.address + wallet.substr(2)

            const order = buildOrder(
                swap,
                dai,
                weth,
                1,
                1,
                zeroAddress,
                swap.interface.encodeFunctionData("timestampBelow", [0xff00000000]),
                "0x",
                interaction,
                notificationReceiver.address,
            )
            const data = buildOrderData(chainId, swap.address, order)
            const signature = await account._signTypedData(data.domain, data.types, data.message)

            const makerDai = await dai.balanceOf(wallet)
            const takerDai = await dai.balanceOf(receiver)
            const makerWeth = await weth.balanceOf(wallet)
            const takerWeth = await weth.balanceOf(receiver)
            const makerEth = await ethers.provider.getBalance(wallet)

            await swap.fillOrder(order, signature, 1, 0, 1)

            expect(await dai.balanceOf(wallet)).to.equal(makerDai.sub(1))
            expect(await dai.balanceOf(receiver)).to.equal(takerDai.add(1))
            expect(await weth.balanceOf(wallet)).to.equal(makerWeth)
            expect(await ethers.provider.getBalance(wallet)).to.equal(makerEth.add(1))
            expect(await weth.balanceOf(receiver)).to.equal(takerWeth.sub(1))
        })
    })
})
