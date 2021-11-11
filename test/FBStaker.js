const { BN, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const truffleAssert = require('truffle-assertions');

const FBStaker = artifacts.require("./FBStaker.sol");
const Dai = artifacts.require("./Dai.sol");

contract("FBStaker", accounts => {

  beforeEach(async function () {
    this.DaiInterface = await Dai.new({ from: accounts[0] });
    this.FBStakerInstance = await FBStaker.new({ from: accounts[0] });
  });

  it("Test Dai.Faucet", async function () {

    await this.DaiInterface.faucet(accounts[1], new BN(100))
    expect(await this.DaiInterface.balanceOf(accounts[1])).to.be.bignumber.equal(new BN(100));
  });

  it("Allow transfer of 1 Dai", async function () {

    await this.DaiInterface.faucet(accounts[1], new BN(100))
    let adr = await this.DaiInterface.approve(this.FBStakerInstance.address, 1) // Customer approves to take possession of dais
    const value = web3.utils.toBN(1);
    await truffleAssert.eventEmitted(adr, "Approval", { value })

  });

  it("Stake of 1 Dai", async function () {

    await this.DaiInterface.faucet(accounts[1], new BN(100))
    await this.DaiInterface.approve(this.FBStakerInstance.address, 1) // Customer approves to take possession of dais
    let aggregator = await web3.eth.ens.getAddress('dai-eth.data.eth')

    let adr = await this.FBStakerInstance.StakeTokens(this.DaiInterface.address, 1, aggregator)

    const value = web3.utils.toBN(1);
    await truffleAssert.eventEmitted(adr, "TokenStaked", { value })

  });

});
