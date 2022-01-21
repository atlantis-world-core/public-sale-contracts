import { useMerkleHelper } from "../../helpers/merkle";

import ADVISORY_WHITELIST from "../../helpers/advisory-whitelist.json";
import ALPHA_SALE_WHITELIST from "../../helpers/alpha-sale-whitelist.json";

export function generateMerkleRoots() {
  const merkleHelper = useMerkleHelper();

  // checks if both arrays are empty, throw exception to stop smart contract deployment
  if (ALPHA_SALE_WHITELIST.length === 0 || ADVISORY_WHITELIST.length === 0) {
    console.error(
      "EMPTY_LEAVES: Either the whitelist leaves or the advisory leaves is empty."
    );
    process.exit(1);
  }

  // merkle trees
  const whitelistMerkleTree = merkleHelper.createMerkleTree(
    ALPHA_SALE_WHITELIST.sort()
  );
  const advisorMerkleTree = merkleHelper.createMerkleTree(
    ADVISORY_WHITELIST.sort()
  );

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  console.log(
    "Merkle root generated for Alpha Sale whitelist\n",
    whitelistMerkleRoot
  );
  console.log(
    "Merkle root generated for advisory whitelist\n\n",
    advisorMerkleRoot
  );

  return {
    whitelistMerkleRoot,
    advisorMerkleRoot,
  };
}
