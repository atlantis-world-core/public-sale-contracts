// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.10;

import "./LibPart.sol";

interface IRoyaltiesProvider {
  function getRoyalties(address _token, uint256 _tokenId)
    external
    returns (LibPart.Part[] memory);
}
