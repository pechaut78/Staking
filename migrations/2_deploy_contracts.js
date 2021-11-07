var FBStaker = artifacts.require("./FBStaker.sol");
var Dai = artifacts.require("./Dai.sol");
FrenchBorg = "0x696A27eccAFE7Ad2eBcD1E985521b7391390E224"

module.exports = async function (deployer) {

  await deployer.deploy(FBStaker, { from: FrenchBorg });
  await deployer.deploy(Dai)
  const dai = Dai.deployed();

};

