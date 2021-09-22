import { ethers, deployments, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { BigNumber } from "ethers"
import {
    AaveLendingPoolMockV2,
    AaveLendingPoolProviderMock,
    AaveLendingProtocol,
    AaveVariableDebtTokenMock,
    ADAIMock,
    ATokenMock,
    ERC20Mock,
    IWETH,
    MarginTradingNotifReceiver,
    Vault,
    WETH,
} from "../typechain"
import { setupTest } from "./fixtures"
use(require("chai-bignumber")())

const toWei = ethers.utils.parseEther
const EXP_SCALE = toWei("1")

describe("AaveLendingProtocol", async function () {
    const { owner: ownerAddr, wallet, recipient } = await getNamedAccounts()
    const signer = await ethers.getSigner(wallet)
    const owner = await ethers.getSigner(ownerAddr)
    const amount = toWei("1")
    const interestModel = ethers.utils.defaultAbiCoder.encode(["uint256"], [1])

    let dai: ERC20Mock
    let weth: WETH
    let vault: Vault
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
            Vault: vault,
            MarginTradingNotifReceiver: notifReceiver,
            AaveLendingProtocol: aave,
            AaveLendingPoolMockV2: pool,
            AaveVariableDebtTokenMock: debtDai,
            ADAIMock: aDai,
            AWETHMock: aWeth,
        } = (await setupTest()) as any)

        await vault.connect(owner).approveReceiver(owner.address)
    })

    it("Set up", async function () {
        expect(await vault.wethToken()).to.eq(weth.address)
        expect(await vault.approvedReceiver(notifReceiver.address)).to.be.true
        expect(await vault.owner()).to.eq(owner.address)
        expect(await notifReceiver.lendingProtocols(aave.address)).to.be.true
        expect(await notifReceiver.vault()).to.eq(vault.address)
        expect(await aave.vault()).to.eq(vault.address)
        expect(await vault.approvedReceiver(owner.address)).to.be.true
    })
    it("Deposit - can onlyApprovedCaller", async function () {
        await weth.connect(signer).transfer(aave.address, amount)
        await expect(aave.connect(signer).lend(weth.address, recipient, "")).to.be.reverted
    })
    it("Deposit - deposit on behalf of recipient", async function () {
        const balanceBefore = await weth.balanceOf(aWeth.address)

        await weth.connect(signer).transfer(aave.address, amount)
        await aave.connect(owner).lend(weth.address, recipient, "0x")

        expect(await weth.balanceOf(aave.address)).to.eq(0)
        expect(await weth.balanceOf(aWeth.address)).to.eq(balanceBefore.add(amount))
        expect(await aWeth.balanceOf(recipient)).to.eq(amount)
    })
    it("Borrow - can onlyApprovedCaller", async function () {
        await expect(aave.connect(signer).borrow(weth.address, amount, recipient, interestModel)).to.be.reverted
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
        // Borrow
        await aave.connect(owner).borrow(dai.address, amtToBorrow, recipient, interestModel)
        expect(await dai.balanceOf(aave.address)).to.eq(0)
        expect(await dai.balanceOf(aDai.address)).to.eq(balanceBefore.sub(amtToBorrow))
        expect(await debtDai.balanceOf(recipient)).to.eq(amtToBorrow)
    })
})