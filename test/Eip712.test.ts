import { expect } from "chai"
import { Contract } from "ethers"
import { deployments, ethers, getNamedAccounts } from "hardhat"
import { domainSeparator } from "./helpers/eip712"
import { name, version } from "./helpers/utils"
import { WrappedTokenMock, TokenMock, LimitOrderProtocol } from "../typechain"

describe("EIP712", async function () {
    const deployedContracts: { [name: string]: Contract } = {}
    const { owner } = await getNamedAccounts()
    const signer = await ethers.getSigner(owner)

    let dai: TokenMock
    let weth: WrappedTokenMock
    let swap: LimitOrderProtocol
    let chainId
    beforeEach(async function () {
        const results = await deployments.fixture(["LimitOrderProtocol"])
        for (const [name, result] of Object.entries(results)) {
            deployedContracts[name] = await ethers.getContractAt(name, result.address, signer)
        }
        ;({ LimitOrderProtocol: swap, TokenMock: dai, WrappedTokenMock: weth } = deployedContracts as any)
        chainId = await dai.getChainId()
    })

    it("domain separator", async function () {
        expect(await swap.DOMAIN_SEPARATOR()).to.equal(domainSeparator(name, version, chainId, swap.address))
    })
})
