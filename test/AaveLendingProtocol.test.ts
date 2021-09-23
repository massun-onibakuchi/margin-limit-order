import { ethers, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import {
    AaveLendingPoolMockV2,
    AaveLendingProtocol,
    AaveVariableDebtTokenMock,
    ATokenMock,
    ERC20Mock,
    MarginTradingNotifReceiver,
    FactoryClone,
    WETH,
} from "../typechain"
import { setupTest } from "./fixtures"
import { deployClone } from "./helpers/clone"

use(require("chai-bignumber")())

const toWei = ethers.utils.parseEther

describe("AaveLendingProtocol", async function () {
    const { owner: ownerAddr, wallet, recipient } = await getNamedAccounts()
    const signer = await ethers.getSigner(wallet)
    const owner = await ethers.getSigner(ownerAddr)
    const amount = toWei("1")
    const interestModel = ethers.utils.defaultAbiCoder.encode(["uint256"], [2])

    let dai: ERC20Mock
    let weth: WETH
    let factory: FactoryClone
    let notifReceiver: MarginTradingNotifReceiver
    let aave: AaveLendingProtocol
    let pool: AaveLendingPoolMockV2
    let aDai: ATokenMock
    let aWeth: ATokenMock
    let debtDai: AaveVariableDebtTokenMock
    beforeEach(async function () {
        ;({
            ERC20Mock: dai,
            WETH: weth,
            FactoryClone: factory,
            // MarginTradingNotifReceiver: notifReceiver,
            AaveLendingProtocol: aave,
            AaveLendingPoolMockV2: pool,
            AaveVariableDebtTokenMock: debtDai,
            ADAIMock: aDai,
            AWETHMock: aWeth,
        } = (await setupTest()) as any)

        notifReceiver = (await deployClone(factory, signer)) as any
    })

    it("Set up", async function () {
        expect(await factory.wethToken()).to.eq(weth.address)
        expect(await factory.owner()).to.eq(owner.address)
        expect(await factory.lendingProtocols(aave.address)).to.be.true
        expect(await notifReceiver.factory()).to.eq(factory.address)
    })
    it("Deposit - deposit on behalf of recipient", async function () {
        const balanceBefore = await weth.balanceOf(aWeth.address)

        await weth.connect(signer).transfer(aave.address, amount)
        await aave.connect(owner).lend(weth.address, recipient, "0x")

        expect(await weth.balanceOf(aave.address)).to.eq(0)
        expect(await weth.balanceOf(aWeth.address)).to.eq(balanceBefore.add(amount))
        expect(await aWeth.balanceOf(recipient)).to.eq(amount)
    })
    it("Borrow - need borowAllowance", async function () {
        await weth.connect(signer).transfer(aave.address, amount)
        await aave.connect(owner).lend(weth.address, recipient, "0x")

        await expect(aave.connect(owner).borrow(weth.address, amount, recipient, interestModel)).to.be.reverted
    })
    it("Borrow - Borrow WETH on behalf of recipient", async function () {
        const amtToBorrow = toWei("1")
        const balanceBefore = await dai.balanceOf(aDai.address)
        // Deposit collateral
        await weth.connect(signer).transfer(aave.address, amount)
        await aave.connect(owner).lend(weth.address, recipient, "0x")
        // Credit delegation to AaveLendingProtocol
        await debtDai.connect(await ethers.getSigner(recipient)).approveDelegation(aave.address, amtToBorrow)
        expect(await debtDai.borrowAllowance(recipient, aave.address)).eq(amtToBorrow)
        // Borrow WETH using `recipient` 's credit, and then transfer the WETH to `recipient`
        await aave.connect(owner).borrow(dai.address, amtToBorrow, recipient, interestModel)
        expect(await dai.balanceOf(aave.address)).to.eq(0)
        expect(await dai.balanceOf(aDai.address)).to.eq(balanceBefore.sub(amtToBorrow))
        expect(await debtDai.balanceOf(recipient)).to.eq(amtToBorrow)
    })
})
