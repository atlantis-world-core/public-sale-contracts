// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IKeys {
  function mintKeyToUser(address) external;

  function burnKeyOfUser(uint256, address) external;
}
