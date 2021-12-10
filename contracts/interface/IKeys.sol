pragma solidity ^0.8.4;

interface IKeys {
  function mintKeyToUser(address) external;

  function burnKeyOfUser(uint256, address) external;
}
