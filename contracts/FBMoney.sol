// SPDX-License-Identifier:MIT
pragma solidity 0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FBMoney is ERC20 {
	/**
	 * @dev our own token
	 */
	constructor(uint256 initialAmount) ERC20("FranceBorgMoney", "FBM") {
		_mint(msg.sender, initialAmount * 10 * uint256(decimals()));
	}
}
