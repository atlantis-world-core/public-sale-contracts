// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IScroll {
    struct Scroll {
        uint256 age;
        uint256 aesthetic;
        uint256 guildId;
    }

    function mint(address, uint256) external;

    function getUserTokenDetails(address, uint256)
        external
        returns (Scroll memory);
}
