// SPDX-License-Identifier: GNU General Public License v3.0
pragma solidity ^0.8.10;

import "./LibPart.sol";

interface RoyaltiesV2 {
  event RoyaltiesSet(uint256 tokenId, LibPart.Part[] royalties);

  function getRaribleV2Royalties(uint256 _id)
    external
    view
    returns (LibPart.Part[] memory);
}
