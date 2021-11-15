import React, { Component } from "react";
import Dai from "./contracts/Dai.json";
import FBStaker from "./contracts/FBStaker.json";

import getWeb3 from "./getWeb3";
import "./App.css";
import { web3 } from "@openzeppelin/test-helpers/src/setup";
import { FrenchBorg, customerAccount } from "./myaddresses"
const BN = require('bn.js');






class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, dai: null, fbstaker: null, daiBalance: 0, stakedBalance: 0, aggregator: 0, bonus: "", moneyBalance: "", initializing: false, operationPending: false };


  Initializing = (initializing) => {
    this.setState({ initializing })
  }
  OperationPending = (operationPending) => {
    this.setState({ operationPending })
  }

  componentDidMount = async () => {

    this.Initializing(true)

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

      const daiBalance = await this.state.dai.methods.balanceOf(customerAccount).call()
      this.setState({ daiBalance })
      this.getENSAggregator();
      this.updateStakedBalance();
      this.updateMoneyBalance();



    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
    this.Initializing(false)
  };


  // insert check Icon if value is true
  insertCheck = (value) => {
    if (value === false)
      return (<i className="fas fa-check-square" color="green"></i>)
    return (<i className="far fa-square" color="red" />)
  }


  // For displaying customer dai balance
  updateDestBalance = async () => {
    try {
      const daiBalance = await this.state.dai.methods.balanceOf(customerAccount).call()
      this.setState({ daiBalance })
    } catch (err) { console.log(err) }
  }

  //For displaying FBStaker Dai Balance
  updateStakedBalance = async () => {
    try {
      const stakedBalance = await this.state.dai.methods.balanceOf(this.state.fbstaker._address).call()
      this.setState({ stakedBalance })
    } catch (err) { console.log(err) }
  }
  // For displaying the amount of FBMoney
  updateMoneyBalance = async () => {
    try {
      const moneyBalance = (new BN(await this.state.fbstaker.methods.getMoneyBalance().call({ from: this.state.fbstaker._address }))).toString()
      this.setState({ moneyBalance })
    } catch (err) { console.log(err) }
  }

  // Adds 100 Dai to customer's account
  addDai = async () => {

    this.OperationPending(true)
    try {
      await this.state.dai.methods.faucet(customerAccount, new BN(100)).send({ from: customerAccount })
    }
    catch (err) {
      alert("operation aborted")
      this.OperationPending(false)
    }
    this.updateDestBalance();
    this.OperationPending(false)
  }

  // Stake 1 customer's dai - To be called by the customer
  stakeToken = async () => {
    this.OperationPending(true)
    try {
      await this.state.dai.methods.approve(this.state.fbstaker._address, 1).send({ from: customerAccount }) // Customer approves to take possession of dais
      await this.state.fbstaker.methods.StakeTokens(this.state.dai._address, 1, this.state.aggregator).send({ from: customerAccount }) // Do the transfer
    }
    catch (err) {
      alert("operation aborted")
      this.OperationPending(false)

    }
    this.updateDestBalance();
    this.updateStakedBalance();
    this.updateMoneyBalance();
    this.OperationPending(false)
  }

  // To be called by the owner of the Contract
  unstakeToken = async () => {
    this.OperationPending(true)
    try {
      await this.state.fbstaker.methods.UnstakeTokens(customerAccount, this.state.dai._address, 1, this.state.aggregator).send({ from: customerAccount }) // Transfer
    }
    catch (err) {
      alert("operation aborted")
      this.OperationPending(false)
    }

    this.updateDestBalance();
    this.updateStakedBalance();
    this.OperationPending(false)
  }

  retrieveBonus = async () => {

    this.OperationPending(true)
    try {
      // Do the Transfer
      await this.state.fbstaker.methods.retrieveBonuses(customerAccount).send({ from: FrenchBorg })
    }
    catch (err) {
      alert("operation aborted")
      this.OperationPending(false)
    }

    this.updateDestBalance();
    this.updateStakedBalance();
    this.OperationPending(false)
  }

  // Returns the aggregator for the Oracle
  getENSAggregator = async () => {
    let aggregator = await web3.eth.ens.getAddress('dai-eth.data.eth')
    this.setState({ aggregator })
  }

  renderNavBarText = () => {
    let txt = ""
    if (this.state.initializing === true) txt = "Initialization..."
    if (this.state.operationPending === true) txt = "Operation en cours..."
    return txt
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
                <td>Balance Dai du client</td>
              </tr>
              <tr>
                <td>{<p>{this.state.stakedBalance}</p>}</td>
                <td>Balance Dai Staked du client</td>
              </tr>
              <tr>
                <td>{<p>{this.state.moneyBalance}</p>}</td>
                <td>Balance de notre Token</td>
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
        <button onClick={this.unstakeToken}>UnStake 1 dai</button>

        <nav className="navbar fixed-bottom navbar-dark bg-dark">
          <div className="container-fluid">
            <p className="navbar-tex active" >{this.renderNavBarText()}</p>
          </div>
        </nav>


      </div>
    );
  }
}

export default App;
