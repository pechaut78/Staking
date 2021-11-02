
require('dotenv').config();
var HDWalletProvider = require("truffle-hdwallet-provider");
const path = require("path");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  contracts_build_directory: path.join(__dirname, "client/src/contracts"),
  networks: {
    dev: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
      gas: 6721974,
      gasLimit: 26000000000
    },
    kovan: {
      provider: new HDWalletProvider(MNEMONIC, API_URL),     
      network_id: "*",       
      gas: 8000000,        // Ropsten has a lower block limit than mainnet
     }
  
  },
  compilers: {
    solc: {
        version: "0.8.0"
    }
  }

};