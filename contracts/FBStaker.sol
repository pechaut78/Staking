// SPDX-License-Identifier:MIT

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./FBMoney.sol";

struct Stake {
	uint256 dateOfValue;
	uint256 amount;
}
struct Bonus {
	uint256 amount;
	uint256 dateOfValue;
}

contract FBStaker {
	uint256 _Rate = 1;
	address _Owner;
	mapping(address => mapping(address => Stake)) stakeList; // Liste des stakes en cours
	mapping(address => Bonus) bonusList; // List des bonus par utilisateur
	mapping(address => uint256) tokenPool; // List des tokens récupérés

	uint8 _Decimals; // Decimals of our own Mondey
	IERC20 private _FrenchBorgTokenProvider;

	modifier notNull256(uint256 v) {
		require(v != 0);
		_;
	}
	modifier notNullAddress(address v) {
		require(v != address(0));
		_;
	}
	modifier isOwner(address adr) {
		require(adr == _Owner);
		_;
	}

	event TokenStaked(address adr, IERC20 Tkn, uint256 amount);
	event TokenUnstaked(address adr, IERC20 Tkn, uint256 amount);
	event BonusRound(address Customer, IERC20 Token);
	event BonusRetrieved(address adr, uint256 amount);

	constructor() {
		_FrenchBorgTokenProvider = IERC20(new FBMoney(1000)); // Our home-made money
		_Decimals = 18;
		_Owner = msg.sender;
	}

	/**
	 * @dev Returns the balance of our home made token for bonuses
	 */
	function getMoneyBalance() external view returns (uint256) {
		return _FrenchBorgTokenProvider.balanceOf(msg.sender);
	}

	/**
	 * @dev debugging purpose: Returns the amount of money staked per token
	 */
	function getTokenStakedBalance(ERC20 Token)
		external
		view
		returns (uint256)
	{
		return stakeList[msg.sender][address(Token)].amount;
	}

	/**
	 * @dev Make money compatibles if they don't have the same Decimals
	 */
	function scalePrice(
		int256 _price,
		uint8 _priceDecimals,
		uint8 _decimals
	) internal pure returns (int256) {
		// provient de https://docs.chain.link/docs/get-the-latest-price/
		// permet d'adapter les prix en fctn des decimales de chaque monnaie
		if (_priceDecimals < _decimals) {
			return _price * int256(10**uint256(_decimals - _priceDecimals));
		} else if (_priceDecimals > _decimals) {
			return _price / int256(10**uint256(_priceDecimals - _decimals));
		}
		return _price;
	}

	/**
	 * @dev Retourne le ratio temporel en utilisant le delta des blocks
	 * @param Stk Current stake for customers
	 */
	function getRate(Stake memory Stk) internal view returns (uint256) {
		require(block.number > Stk.dateOfValue, "invalid block number");
		// _Rate vaut 1, parité avec ethereum
		// 199385 = 30j * 24h * 60mn * 60s / 13blk
		// return Delta Block * Taux par mois / BlockParMois
		return
			uint256(
				((uint256(block.number - Stk.dateOfValue) * _Rate) /
					uint256(199385))
			);
	}

	/**
	 * @dev Given a stake, returns the value of potential bonuses
	 * @param Stk Current stake for customers
	 * @param Aggregator used for getting Token value
	 */
	function computeBonus(Stake memory Stk, address Aggregator)
		internal
		view
		returns (uint256)
	{
		// On récupere le prix en ETH
		(, int256 ratio, , , ) = AggregatorV3Interface(Aggregator)
			.latestRoundData();
		uint8 tokenDecimals = AggregatorV3Interface(Aggregator).decimals();
		// On remet a l'echelle en fonction des decimales de chaque monnaie si besoin
		if (tokenDecimals != _Decimals)
			return
				Stk.amount *
				getRate(Stk) *
				uint256(scalePrice(ratio, tokenDecimals, _Decimals) * ratio);
		return Stk.amount * getRate(Stk) * uint256(ratio);
	}

	/**
	 * @dev Internal function for evaluating and aggregating Bonuses
	 * @param customer for which customer ?
	 * @param Stk Current stake for customers
	 * @param Aggregator used for getting Token value
	 */
	function aggregateBonus(
		address customer,
		address Aggregator,
		Stake memory Stk
	) internal {
		// evaluate new potential bonus
		uint256 bonus = computeBonus(Stk, Aggregator);
		if (bonus > 0) bonusList[customer].amount += bonus;
	}

	/**
	 * @dev send all acquired bonuses to a customer- to be called by the owner of the contract
	 * @param customer customer who wants to get the FBMoney back
	 */
	function dispatchBonuses(address customer)
		external
		notNullAddress(customer)
	{
		// We only dispatch bonuses already acquired, we do not update the amount
		uint256 bonus = bonusList[customer].amount;

		// Transfer Bonuses to customer
		if (bonus != 0) {
			bonusList[customer].amount = 0;
			emit BonusRetrieved(customer, bonus);
			_FrenchBorgTokenProvider.transferFrom(msg.sender, customer, bonus);
		}
	}

	/**
	 * @dev Stake swap some tokens for our money token - To be called by the customer
	 * @param Token customer's Token
	 * @param amount amount of customer's token to Stake
	 * @param Aggregator Provided by JS for the correct PAIR
	 */
	function StakeTokens(
		IERC20 Token,
		uint256 amount,
		address Aggregator
	)
		external
		notNull256(amount)
		notNullAddress(address(Token))
		notNullAddress(Aggregator)
	{
		// Trouve la reference du client
		Stake storage Stk = stakeList[msg.sender][address(Token)];

		// Compute and transfer Bonus
		//Le stake n'est peut etre pas vide, aussi on doit d'abord mettre a jour les bonuses
		if (Stk.amount > 0) aggregateBonus(msg.sender, Aggregator, Stk);
		// Met à jour maintenant, apres avoir aggrégé, la balance de tokens
		Stk.amount += amount;
		Stk.dateOfValue = block.number;
		emit TokenStaked(msg.sender, Token, amount);
		// Transfer the tokens, supposing the approve has been done
		Token.transferFrom(msg.sender, address(this), amount);
	}

	/**
	 * @dev Unstake the staked tokens
	 * @param Customer Customer's address
	 * @param Token customer's Token
	 * @param amount amount of customer's token to Stake
	 * @param Aggregator Provided by JS for the correct PAIR
	 */
	function UnstakeTokens(
		address Customer,
		IERC20 Token,
		uint256 amount,
		address Aggregator
	)
		external
		notNull256(amount)
		notNullAddress(Customer)
		notNullAddress(address(Token))
		notNullAddress(Aggregator)
	{
		// Trouve la reference du client
		Stake storage Stk = stakeList[Customer][address(Token)];
		// On essai de retirer de trop ?
		require(Stk.amount >= amount, "amount too high");
		// Compute and aggregate Bonus if required
		if (Stk.amount > 0) aggregateBonus(Customer, Aggregator, Stk);

		Stk.amount -= amount;
		Stk.dateOfValue = block.number;
		emit TokenUnstaked(Customer, Token, amount);

		Token.transfer(Customer, amount);
	}

	/**
	 * @dev Triggers bonus computation, for calling on timer
	 * @param Customer Customer's address
	 * @param Token customer's Token
	 * @param Aggregator Provided by JS for calulating Parity
	 */
	function bonusRound(
		address Customer,
		IERC20 Token,
		address Aggregator
	)
		external
		notNullAddress(Customer)
		notNullAddress(address(Token))
		notNullAddress(Aggregator)
	{
		// Must be called by the owner of the contract to distribute the bonuses
		require(msg.sender == _Owner);
		// Trouve la reference du client
		Stake storage Stk = stakeList[Customer][address(Token)];
		// Compute and aggregate Bonus if necessary
		if (Stk.amount > 0) {
			aggregateBonus(Customer, Aggregator, Stk);
			Stk.dateOfValue = block.number;
		}
		emit BonusRound(Customer, Token);
	}
}
