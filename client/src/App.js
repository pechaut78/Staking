import React, { Component } from "react";
import Dai from "./contracts/Dai.json";
import FBStaker from "./contracts/FBStaker.json";

import getWeb3 from "./getWeb3";
import "./App.css";
import { web3 } from "@openzeppelin/test-helpers/src/setup";

const BN = require('bn.js');

const sourceAccount = "0xBB26426dF6574c8910810e0a2580f39e82CfC3e3"
const destinationAccount = "0x696A27eccAFE7Ad2eBcD1E985521b7391390E224"


class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, dai: null, fbstaker: null, daiBalance: 0, stakedBalance: 0, aggregator: 0, bonus: "", moneyBalance: "" };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the Dai contract instance.
      const networkId = await web3.eth.net.getId();
      this.deployedNetwork = Dai.networks[networkId];
      const instanceDai = new web3.eth.Contract(
        Dai.abi,
        this.deployedNetwork && this.deployedNetwork.address,
      );

      this.deployedNetwork = FBStaker.networks[networkId];
      const instanceFBStaker = new web3.eth.Contract(
        FBStaker.abi,
        this.deployedNetwork && this.deployedNetwork.address,
      );



      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, dai: instanceDai, fbstaker: instanceFBStaker }, this.runExample);

      const daiBalance = await this.state.dai.methods.balanceOf(destinationAccount).call()
      this.setState({ daiBalance })
      this.updateStakedBalance();
      this.updateMoneyBalance();
      this.getENSAggregator();

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  runExample = async () => {
    const { accounts, contract } = this.state;

    // Stores a given value, 5 by default.
    //await contract.methods.set(5).send({ from: accounts[0] });

    // Get the value from the contract to prove it worked.
    // const response = await contract.methods.get().call();

    // Update state with the result.
    //this.setState({ storageValue: response });
  };

  insertCheck = (value) => {
    if (value === false)
      return (<i className="fas fa-check-square" color="green"></i>)
    return (<i className="far fa-square" color="red" />)
  }


  updateDestBalance = async () => {
    const daiBalance = await this.state.dai.methods.balanceOf(destinationAccount).call()
    this.setState({ daiBalance })
  }
  updateStakedBalance = async () => {
    const stakedBalance = await this.state.dai.methods.balanceOf(this.state.fbstaker._address).call()
    this.setState({ stakedBalance })

  }
  updateMoneyBalance = async () => {
    const moneyBalance = (new BN(await this.state.fbstaker.methods.getMoneyBalance().call({ from: this.state.fbstaker._address }))).toString()
    this.setState({ moneyBalance })
  }

  addDai = async () => {
    await this.state.dai.methods.faucet(destinationAccount, new BN(100)).send({ from: destinationAccount })
    this.updateDestBalance();
  }

  stakeToken = async () => {
    await this.state.dai.methods.approve(this.state.fbstaker._address, 10).send({ from: destinationAccount })
    await this.state.fbstaker.methods.StakeTokens(this.state.dai._address, 10, this.state.aggregator).send({ from: destinationAccount })
    this.updateDestBalance();
    this.updateStakedBalance();
    this.updateMoneyBalance();
  }

  unstakeToken = async () => {
    //await this.state.fbstaker.methods.UnstakeTokens(this.state.dai._address, 1, this.state.aggregator).send({ from: destinationAccount })
    this.state.fbstaker.methods.UnstakeTokens(this.state.dai._address, 1, this.state.aggregator).call({ from: destinationAccount })
    this.updateDestBalance();
    this.updateStakedBalance();
  }

  getENSAggregator = async () => {
    let aggregator = await web3.eth.ens.getAddress('dai-eth.data.eth')
    this.setState({ aggregator })
  }

  evaluateBonus = async () => {
    let bonus = (new BN(await this.state.fbstaker.methods.evaluateBonus(this.state.dai._address, this.state.aggregator).call())).toString()
    this.setState({ bonus })
  }

  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        <div  >
          <table className="table table-dark table-striped table-bordered w-auto text-center"  >
            <thead>
              <tr>
                <th scope="col"> Etat
                </th>
                <th scope="col">Operation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{this.insertCheck(this.state.web3 === 0)}</td>
                <td>Web3 Initialisé</td>
              </tr>
              <tr>
                <td>{this.insertCheck(this.state.dai === 0)}</td>
                <td>Contrat Dai Trouve</td>
              </tr>
              <tr>
                <td>{this.insertCheck(this.state.fbstaker === 0)}</td>
                <td>Contrat FBStaker Trouve</td>
              </tr>
              <tr>
                <td>{<p>{this.state.daiBalance}</p>}</td>
                <td>Balance Dai Client</td>
              </tr>
              <tr>
                <td>{<p>{this.state.stakedBalance}</p>}</td>
                <td>Balance Dai Staked</td>
              </tr>
              <tr>
                <td>{<p>{this.state.moneyBalance}</p>}</td>
                <td>Balance money</td>
              </tr>
              <tr>
                <td>{this.insertCheck(this.state.aggregator === 0)}</td>
                <td>aggregator Trouve</td>
              </tr>
              <tr>
                <td>{<p>{this.state.bonus}</p>}</td>
                <td>Bonus evalue</td>
              </tr>
            </tbody>
          </table>
        </div>


        <h2>Defi Staking</h2>
        <button onClick={this.addDai}>ajoute 100 dai au client</button>
        <button onClick={this.stakeToken}>Stake 1 dai</button>
        <button onClick={this.evaluateBonus}>Evaluate Bonus</button>
        <button onClick={this.unstakeToken}>UnStake 1 dai</button>
        <p>
          If your contracts compiled and migrated successfully, below will show
          a stored value of 5 (by default).
        </p>
        <p>
          Try changing the value stored on <strong>line 42</strong> of App.js.
        </p>
        <div>The stored value is: {this.state.storageValue}</div>
      </div>
    );
  }
}

export default App;
