// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.10;

interface IAtlantisWorldMagicalKeys {
  function mintKeyToUser(address) external;

  function burnKeyOfUser(uint256, address) external;
}
