// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IScroll {
  function mint(address, uint256) external;

  function getUserTokenDetails(address, uint256)
    external
    returns (Scroll memory);
}
