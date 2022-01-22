// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.10;

library LibPart {
  bytes32 public constant TYPE_HASH =
    keccak256("Part(address account,uint96 value)");

  struct Part {
    address payable account;
    uint96 value;
  }

  function hash(Part memory _part) internal pure returns (bytes32) {
    return keccak256(abi.encode(TYPE_HASH, _part.account, _part.value));
  }
}
