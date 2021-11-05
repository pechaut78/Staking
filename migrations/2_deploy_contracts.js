var FBStaker = artifacts.require("./FBStaker.sol");
var Dai = artifacts.require("./Dai.sol");

module.exports = async function(deployer) {
  await deployer.deploy(FBStaker);
  await deployer.deploy(Dai)
  const dai =Dai.deployed();

};
 
