// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @notice Please note that the interface hash used in the below code can change from previous commits.
/// @notice As of 11/8/2021 the current interface hash is 0xcad96cca.
/// @notice Be sure to check if it changes at: https://github.com/rarible/protocol-contracts/blob/master/royalties/contracts/LibRoyaltiesV2.sol

library LibRoyaltiesV2 {
  /*
   * bytes4(keccak256('getRoyalties(LibAsset.AssetType)')) == 0xcad96cca
   */
  bytes4 constant _INTERFACE_ID_ROYALTIES = 0xcad96cca;
}