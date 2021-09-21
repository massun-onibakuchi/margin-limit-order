import { ethers, deployments, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { BigNumber } from "ethers"
import { AaveLendingProtocol, ERC20Mock, IWETH, MarginTradingNotifReceiver, Vault } from "../typechain"
import { setupTest } from "./fixtures"
use(require("chai-bignumber")())

const toWei = ethers.utils.parseEther
const EXP_SCALE = toWei("1")

describe("CreamAccountDataProvider", async function () {
    const { owner, wallet } = await getNamedAccounts()

    let token: ERC20Mock
    let weth: IWETH
    let vault: Vault
    let notifReceiver: MarginTradingNotifReceiver
    let aave: AaveLendingProtocol
    beforeEach(async function () {
        ;({
            ERC20Mock: token,
            WETH: weth,
            Vault: vault,
            MarginTradingNotifReceiver: notifReceiver,
            AaveLendingProtocol: aave,
        } = (await setupTest()) as any)
    })

    it("set up", async function () {
        expect(await vault.wethToken()).to.eq(weth.address)
        expect(await vault.approvedReceiver(notifReceiver.address)).to.be.true
        expect(await vault.owner()).to.eq(owner)
        expect(await notifReceiver.lendingProtocols(aave.address)).to.be.true
        expect(await notifReceiver.vault()).to.eq(vault.address)
    })
})
