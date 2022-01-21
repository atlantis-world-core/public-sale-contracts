import { useMerkleHelper } from "../helpers/merkle";

import ADVISORY_WHITELIST from "../helpers/advisory-whitelist.json";
import ADVISORY_PLACEHOLDER from "../helpers/512-advisory-placeholder.json";

import ALPHA_SALE_WHITELIST from "../helpers/alpha-sale-whitelist.json";
import ALPHA_SALE_PLACEHOLDER from "../helpers/16384-advisory-placeholder.json";

import { ethers } from "ethers";
import { exportJson } from ".";

export async function generateMerkleRoots() {
  const merkleHelper = useMerkleHelper();

  const advisories = ADVISORY_PLACEHOLDER;
  const whitelisters = ALPHA_SALE_PLACEHOLDER;

  // checks if both arrays are empty, throw exception to stop smart contract deployment
  if (ALPHA_SALE_WHITELIST.length === 0 || ADVISORY_WHITELIST.length === 0) {
    console.error(
      "EMPTY_LEAVES: Either the whitelist leaves or the advisory leaves is empty."
    );
    process.exit(1);
  }

  const formatAddress = (address: string) => ethers.utils.getAddress(address);

  const advisoryWhitelist = ADVISORY_WHITELIST.map(formatAddress).sort();
  const alphaSaleWhitelist = ALPHA_SALE_WHITELIST.map(formatAddress).sort();

  for (let index = 0; index < advisoryWhitelist.length; index++) {
    advisories[index] = advisoryWhitelist[index];
  }

  for (let index = 0; index < alphaSaleWhitelist.length; index++) {
    whitelisters[index] = alphaSaleWhitelist[index];
  }

  // merkle trees
  const advisoryTree = merkleHelper.createMerkleTree(advisories);
  const alphaSaleWhitelistTree = merkleHelper.createMerkleTree(whitelisters);

  // merkle roots
  const advisoryMerkleRoot = merkleHelper.createMerkleRoot(advisoryTree);
  const alphaSaleWhitelistMerkleRoot = merkleHelper.createMerkleRoot(
    alphaSaleWhitelistTree
  );

  console.log("advisoryMerkleRoot", advisoryMerkleRoot);
  console.log("alphaSaleWhitelistMerkleRoot", alphaSaleWhitelistMerkleRoot);

  await exportJson("advisory-whitelist-output.json", {
    root: advisoryMerkleRoot,
    leaves: advisories,
  });
  await exportJson("alpha-sale-whitelist-output.json", {
    root: alphaSaleWhitelistMerkleRoot,
    leaves: whitelisters,
  });

  return {
    whitelistMerkleRoot: alphaSaleWhitelistMerkleRoot,
    advisorMerkleRoot: advisoryMerkleRoot,
  };
}
