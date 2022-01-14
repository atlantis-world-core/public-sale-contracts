pragma solidity ^0.8.10;

import "../Sale.sol";

contract TestSale is Sale {
  constructor()
    Sale(
      0x7075152d03a5cd92104887b476862778ec0c87be5c2fa1c0a90f87c49fad6eff,
      0x7075152d03a5cd92104887b476862778ec0c87be5c2fa1c0a90f87c49fad6eff,
      block.timestamp + 10,
      block.timestamp + 10000,
      0x06fd9d0Ae9052A85989D0A30c60fB11753537f9A,
      IERC20(0x06fd9d0Ae9052A85989D0A30c60fB11753537f9A)
    )
  {}

  function echidna_publicKeyCount() external view returns (bool) {
    return publicKeyMintCount <= 2;
  }

  function echidna_advisoryKeyLimit() external view returns (bool) {
    return advisoryKeyLimitCount <= ADVISORY_KEY_LIMIT;
  }

  function echidna_publicPlusAdvisory() external view returns (bool) {
    return publicKeyMintCount + advisoryKeyLimitCount <= 9999;
  }
}
