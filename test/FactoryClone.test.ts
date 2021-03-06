import { ethers, deployments, getNamedAccounts } from "hardhat"
import { expect, use } from "chai"
import { AaveLendingProtocol, ERC20Mock, FactoryClone, IWETH, MarginTradingNotifReceiver } from "../typechain"
import { setupTest } from "./fixtures"
import { deployClone } from "./helpers/clone"
import { Signer } from "@ethersproject/abstract-signer"

use(require("chai-bignumber")())

describe("FactoryClone", async function () {
    let wallet: string
    let owner: string
    let signer: Signer

    let token: ERC20Mock
    let weth: IWETH
    let factory: FactoryClone
    let notifReceiver: MarginTradingNotifReceiver
    let implementation: MarginTradingNotifReceiver
    let aave: AaveLendingProtocol
    before(async function () {
        ;({ owner, wallet } = await getNamedAccounts())
        signer = await ethers.getSigner(wallet)
    })
    beforeEach(async function () {
        ;({
            ERC20Mock: token,
            WETH: weth,
            FactoryClone: factory,
            MarginTradingNotifReceiver: implementation,
            AaveLendingProtocol: aave,
        } = (await setupTest()) as any)
        notifReceiver = (await deployClone(factory, signer)) as any
    })

    it("set up", async function () {
        expect(await factory.wethToken()).to.eq(weth.address)
        expect(await factory.implementation()).to.eq(implementation.address)
        expect(await factory.owner()).to.eq(owner)
        expect(await factory.lendingProtocols(aave.address)).to.be.true
        expect(await notifReceiver.owner()).to.eq(wallet)
        expect(await notifReceiver.factory()).to.eq(factory.address)
    })
})
