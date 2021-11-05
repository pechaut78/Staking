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
	FBMoney private _FrenchBorgTokenProvider;
	uint256 _Rate = 1;
	uint8 _Decimals;

	mapping(address => mapping(address => Stake)) stakeList; // Liste des stakes en cours
	mapping(address => Bonus) bonusList; // List des bonus par utilisateur
	mapping(address => uint256) tokenPool; // List des tokens récupérés

	modifier notNull256(uint256 v) {
		require(v != 0);
		_;
	}

	constructor() {
		_FrenchBorgTokenProvider = new FBMoney(1000);
		_Decimals = _FrenchBorgTokenProvider.decimals();
	}

	/**
	 * @dev Returns the balance of our home made token for bonuses
	 */
	function getMoneyBalance() external view returns (uint256) {
		return _FrenchBorgTokenProvider.balanceOf(msg.sender);
	}

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
		// 152470 = 30 * 24 * 60 * 60 / 17
		// return Delta Block * Taux par mois / BlockParMois
		return
			uint256(
				((uint256(block.number - Stk.dateOfValue) * _Rate) /
					uint256(152470))
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
		returns (int256)
	{
		// On récupere le prix en ETH
		(, int256 ratio, , , ) = AggregatorV3Interface(Aggregator)
			.latestRoundData();
		uint8 tokenDecimals = AggregatorV3Interface(Aggregator).decimals();
		// On remet a l'echelle en fonction des decimales de chaque monnaie si besoin
		if (tokenDecimals != _Decimals)
			return
				int256(Stk.amount * getRate(Stk)) *
				ratio *
				int256(scalePrice(ratio, tokenDecimals, _Decimals));
		return int256(Stk.amount * getRate(Stk)) * ratio;
	}

	/**
	 * @dev Querying current status of staking - external funk
	 * @param Token Token staked by customers
	 * @param Aggregator Provided by JS for evaluating values
	 */
	function evaluateBonus(IERC20 Token, address Aggregator)
		external
		view
		returns (int256)
	{
		Stake memory Stk = stakeList[msg.sender][address(Token)];
		return computeBonus(Stk, Aggregator);
	}

	/**
	 * @dev Internal function for evaluating and retrieving Bonuses
	 * @param Stk Current stake for customers
	 * @param Aggregator used for getting Token value
	 */
	function retrieveBonus(address Aggregator, Stake memory Stk) internal {
		int256 bonus = computeBonus(Stk, Aggregator);
		if (bonus < 0) bonus = 0;

		// Remember we are retrieving, for next evaluation
		bonusList[msg.sender].dateOfValue = block.number;
		Stk.dateOfValue = block.number;

		// Transfer Bonuses to customer
		if (bonus != 0) {
			bonusList[msg.sender].amount += uint256(bonus);
			_FrenchBorgTokenProvider.transfer(msg.sender, uint256(bonus));
		}
	}

	/**
	 * @dev Stake swap some tokens for our money token
	 * @param Token customer's Token
	 * @param amount amount of customer's token to Stake
	 * @param Aggregator Provided by JS for the correct PAIR
	 */
	function StakeTokens(
		IERC20 Token,
		uint256 amount,
		address Aggregator
	) external notNull256(amount) {
		assert(address(Token) != address(0));
		assert(address(Aggregator) != address(0));
		// Trouve la reference du client
		Stake memory Stk = stakeList[msg.sender][address(Token)];

		// On mémorise la quantité par token, pour utilisation eventuelle
		tokenPool[address(Token)] += amount;

		// Compute and transfer Bonus
		//Le stake n'est peut etre pas vide, aussi on doit d'abord mettre a jour les bonuses
		retrieveBonus(Aggregator, Stk);
		stakeList[msg.sender][address(Token)].amount += amount;
		// Transfer the tokens, supposing the approve has been done
		Token.transferFrom(msg.sender, address(this), amount);
	}

	/**
	 * @dev Unstake the staked tokens
	 * @param Token customer's Token
	 * @param amount amount of customer's token to Stake
	 * @param Aggregator Provided by JS for the correct PAIR
	 */
	function UnstakeTokens(
		IERC20 Token,
		uint256 amount,
		address Aggregator
	) external notNull256(amount) {
		require(address(Token) != address(0));
		require(address(Aggregator) != address(0));

		// Trouve la reference du client
		Stake memory Stk = stakeList[msg.sender][address(Token)];
		// On essai de retirer de trop ?
		require(Stk.amount >= amount, "amount too high");

		// Compute and transfer Bonus
		retrieveBonus(Aggregator, Stk);
		Stk.amount -= amount;
		Token.transferFrom(address(this), msg.sender, amount);
	}
}
