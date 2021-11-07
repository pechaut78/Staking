import React, { Component } from "react";
import Dai from "./contracts/Dai.json";
import FBStaker from "./contracts/FBStaker.json";

import getWeb3 from "./getWeb3";
import "./App.css";
import { web3 } from "@openzeppelin/test-helpers/src/setup";

const BN = require('bn.js');


const customerAccount = "0xFD7c7aa42EF7EFAf544B783549677b2fC20C3Ee9" // Customer
const FrenchBorg = "0x696A27eccAFE7Ad2eBcD1E985521b7391390E224" // Owner of the contract

function openModal(refer) {

}
function closeModal(refer) {

}

class App extends Component {
  state = { storageValue: 0, web3: null, accounts: null, dai: null, fbstaker: null, daiBalance: 0, stakedBalance: 0, aggregator: 0, bonus: "", moneyBalance: "" };


  componentDidMount = async () => {
    var initModal = document.getElementById('initModal')
    this._operationModal = document.getElementById('waitingOperation')
    openModal(initModal)

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

      closeModal(initModal)

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };


  // insert check Icon if value is true
  insertCheck = (value) => {
    if (value === false)
      return (<i className="fas fa-check-square" color="green"></i>)
    return (<i className="far fa-square" color="red" />)
  }


  // For displaying customer dai balance
  updateDestBalance = async () => {
    const daiBalance = await this.state.dai.methods.balanceOf(customerAccount).call()
    this.setState({
      daiBalance
    })
  }

  //For displaying FBStaker Dai Balance
  updateStakedBalance = async () => {
    const stakedBalance = await this.state.dai.methods.balanceOf(this.state.fbstaker._address).call()
    this.setState({ stakedBalance })
  }
  // For displaying the amount of FBMoney
  updateMoneyBalance = async () => {
    const moneyBalance = (new BN(await this.state.fbstaker.methods.getMoneyBalance().call({ from: this.state.fbstaker._address }))).toString()
    this.setState({ moneyBalance })
  }

  // Adds 100 Dai to customer's account
  addDai = async () => {
    openModal(this._operationModal)
    await this.state.dai.methods.faucet(customerAccount, new BN(100)).send({ from: customerAccount })
    this.updateDestBalance();
    closeModal(this._operationModal)
  }

  // Stake 1 customer's dai - To be called by the customer
  stakeToken = async () => {
    openModal(this._operationModal)
    await this.state.dai.methods.approve(this.state.fbstaker._address, 1).send({ from: customerAccount }) // Customer approves to take possession of dais
    await this.state.fbstaker.methods.StakeTokens(this.state.dai._address, 1, this.state.aggregator).send({ from: customerAccount }) // Do the transfer

    this.updateDestBalance();
    this.updateStakedBalance();
    this.updateMoneyBalance();
    closeModal(this._operationModal)
  }

  // To be called by the owner of the Contract
  unstakeToken = async () => {
    openModal(this._operationModal)
    await this.state.dai.methods.approve(customerAccount, 1).send({ from: FrenchBorg }) // The owner of the contract allows withdrawal
    await this.state.fbstaker.methods.UnstakeTokens(customerAccount, this.state.dai._address, 1, this.state.aggregator).send({ from: FrenchBorg }) // Transfer
    await this.state.fbstaker.methods.retrieveBonus(customerAccount, this.state.dai._address, this.state.aggregator).send({ from: FrenchBorg })
    this.updateDestBalance();
    this.updateStakedBalance();
    closeModal(this._operationModal)
  }

  // Returns the aggregator for the Oracle
  getENSAggregator = async () => {
    let aggregator = await web3.eth.ens.getAddress('dai-eth.data.eth')
    this.setState({ aggregator })
  }


  // evaluates the bonus - now
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
        <button onClick={this.evaluateBonus}>Evaluate Bonus</button>
        <p>Changer de compte Metamask vers le compte Owner -></p>
        <button onClick={this.unstakeToken}>UnStake 1 dai</button>


        <div className="modal fade" id="waitingOperation" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transaction</h5>
              </div>
              <div className="modal-body">
                <span className="spinner-border spinner-border-sm " role="status" />
                <span> En attente d'execution de la demande </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal fade" id="initModal" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Connexion</h5>
              </div>
              <div className="modal-body">
                <span className="spinner-border spinner-border-sm " role="status" />
                <span> Veuillez vous connecter avec Metamask </span>
              </div>
            </div>
          </div>
        </div>


      </div>
    );
  }
}

export default App;
