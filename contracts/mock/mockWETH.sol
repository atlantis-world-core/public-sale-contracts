//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockWETH is ERC20 {
  bool _paused = false;

  constructor() ERC20("Wrapped ETH", "WETH") {
    _mint(msg.sender, 10000000000000000000000000000000000);
  }

  function setPaused(bool pause) public {
    _paused = pause;
  }

  function transfer(address recipient, uint256 amount)
    public
    override
    returns (bool)
  {
    if (_paused) return false;
    _transfer(_msgSender(), recipient, amount);
    return true;
  }

  function mint(address receiver_, uint256 amount_) public {
    _mint(receiver_, amount_);
  }
}
