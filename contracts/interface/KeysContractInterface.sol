// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface KeysContractInterface {
    function mintKeyToUser(address) external;

    function burnKeyOfUser(uint256, address) external;
}
