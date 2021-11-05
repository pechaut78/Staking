const { BN, ether } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const FBStaker = artifacts.require("./FBStaker.sol");
const tokenAddress = '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa';
contract("FBStaker", accounts => {
  beforeEach(async function () {
    this.FBStakerInstance = await FBStaker.new({from:accounts[0]});
    });

  it("Test Deployment of the Token", async () => {
      console.log(this.FBStakerInstance);

    // Set value of 89
   // let adr = await  this.FBStakerInstance.StakeTokens(tokenAddress,accounts[1],1,{from:account[10]})
   // console.log(adr);
  });
});
