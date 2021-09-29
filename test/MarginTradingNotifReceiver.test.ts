import { ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import {
    AaveLendingProtocol,
    AaveVariableDebtTokenMock,
    ATokenMock,
    ERC20Mock,
    LimitOrderProtocol,
    MarginTradingNotifReceiver,
    FactoryClone,
    WETH,
} from "../typechain"
import { setupTest } from "./fixtures"
import { buildOrder } from "./helpers/order"
import { buildOrderData } from "./helpers/utils"
import { deployClone } from "./helpers/clone"
use(require("chai-bignumber")())

const toWei = ethers.utils.parseEther

describe("MarginTradingNotifReceiver", async function () {
    let chainId
    let signer
    let taker
    let owner

    const interestModel = ethers.utils.defaultAbiCoder.encode(["uint256"], [2])

    let dai: ERC20Mock
    let weth: WETH
    let factory: FactoryClone
    let notifReceiver: MarginTradingNotifReceiver
    let aave: AaveLendingProtocol
    let swap: LimitOrderProtocol
    let aDai: ATokenMock
    let aWeth: ATokenMock
    let debtDai: AaveVariableDebtTokenMock
    before(async function () {
        ;({ owner } = await getNamedAccounts())
        const { wallet, taker: takerAddr } = await getNamedAccounts()
        ;({ chainId } = await ethers.provider.getNetwork())
        signer = await ethers.getSigner(wallet) // maker
        taker = await ethers.getSigner(takerAddr)
    })
    beforeEach(async function () {
        ;({
            ERC20Mock: dai,
            WETH: weth,
            FactoryClone: factory,
            AaveLendingProtocol: aave,
            LimitOrderProtocol: swap,
            ADAIMock: aDai,
            AaveVariableDebtTokenMock: debtDai,
            AWETHMock: aWeth,
        } = (await setupTest()) as any)

        notifReceiver = (await deployClone(factory, signer)) as any

        await weth.connect(taker).deposit({ value: toWei("1") })
        await dai.mint(signer.address, toWei("1"))
    })

    it("Set up", async function () {
        expect(await factory.wethToken()).to.eq(weth.address)
        expect(await factory.deployedContracts()).to.include(notifReceiver.address)
        expect(await factory.owner()).to.eq(owner)
        expect(await factory.lendingProtocols(aave.address)).to.be.true
        expect(await notifReceiver.factory()).to.eq(factory.address)
        expect(await notifReceiver.limitOrderProtocol()).to.eq(swap.address)
    })
    it("Margin trading", async function () {
        // signer who is a maker would buy WETH and deposit it as collateral, then borrow DAI to sell.
        const amtToLend = toWei("1.5")
        const amtToBuy = toWei("1")
        const amtToBorrow = toWei("1")
        const interaction =
            notifReceiver.address +
            ethers.utils.defaultAbiCoder
                .encode(
                    [
                        "tuple(address lendingPool, uint256 takerAmount, uint256 amtToLend, bool useVault, bytes data) MarginOrderData",
                    ],
                    [
                        {
                            lendingPool: aave.address,
                            takerAmount: amtToBuy,
                            amtToLend: amtToLend,
                            useVault: false,
                            data: interestModel,
                        },
                    ],
                )
                .substr(2)

        await weth.connect(signer).approve(notifReceiver.address, amtToLend)
        await weth.connect(signer).approve(swap.address, amtToLend.sub(amtToBuy))
        await weth.connect(taker).approve(swap.address, amtToBorrow)
        await dai.connect(signer).approve(swap.address, amtToBorrow)
        // Credit delegation to AaveLendingProtocol
        await debtDai.connect(signer).approveDelegation(aave.address, amtToBorrow)
        expect(await debtDai.borrowAllowance(signer.address, aave.address)).eq(amtToBorrow)

        const order = buildOrder(
            swap,
            dai, // maker asset which maker want to sell
            weth, // taker asset which maker want to buy
            amtToBorrow, // makerAsset Amount
            amtToBuy, // takerAsset Amount
            signer.address, // maker
            ethers.constants.AddressZero,
            swap.interface.encodeFunctionData("timestampBelow", [0xff00000000]),
            "0x",
            interaction,
            notifReceiver.address, // CustomReceiver
        )
        const data = buildOrderData(chainId, swap.address, order)
        const signature = await signer._signTypedData(data.domain, { Order: data.types.Order }, data.message)

        const balanceBefore = await dai.balanceOf(aDai.address)
        const takerDai = await dai.balanceOf(taker.address)
        const signerWeth = await weth.balanceOf(signer.address)
        const takerWeth = await weth.balanceOf(taker.address)

        await swap
            .connect(taker)
            .fillOrder(
                order,
                signature,
                amtToBorrow /* makingAmount */,
                0 /* takingAmount */,
                amtToBuy /* thresholdAmount */,
            )

        expect(await dai.balanceOf(aave.address)).to.eq(0)
        expect(await dai.balanceOf(taker.address)).to.eq(takerDai.add(amtToBorrow))
        expect(await dai.balanceOf(aDai.address)).to.eq(balanceBefore.sub(amtToBorrow))
        expect(await debtDai.balanceOf(signer.address)).to.eq(amtToBorrow)
        expect(await weth.balanceOf(taker.address)).to.eq(takerWeth.sub(amtToBorrow))
        expect(await weth.balanceOf(signer.address)).to.eq(signerWeth.sub(amtToLend.sub(amtToBuy)))
        expect(await aWeth.balanceOf(signer.address)).to.eq(amtToLend)
    })
})
