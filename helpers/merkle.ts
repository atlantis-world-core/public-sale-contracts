// import { ADVISOR_WHITELISTED_USERS, WHITELISTED_USERS } from "./whitelist";
import { MerkleTree } from "merkletreejs";
import { ethers } from "hardhat";
import keccak256 from "keccak256";

export const useMerkleHelper = () => {
  const createMerkleTree = (leaves: string[]): MerkleTree => {
    leaves = leaves.map((leaf) =>
      ethers.utils.solidityKeccak256(["address"], [leaf])
    );

    return new MerkleTree(leaves, keccak256, { sort: true });
  };

  const createMerkleProof = (
    tree: MerkleTree,
    leaf: string,
    index?: number
  ): string[] => {
    return tree.getHexProof(leaf, index);
  };

  const createMerkleRoot = (tree: MerkleTree): string => tree.getHexRoot();

  return {
    createMerkleTree,
    createMerkleProof,
    createMerkleRoot,
  };
};

// const WHITELIST_LEAVES = WHITELISTED_USERS.map((x) => keccak256(x));
// const ADVISOR_LEAVES = ADVISOR_WHITELISTED_USERS.map((x) => keccak256(x));

// const whitelistMerkleTree = new MerkleTree(WHITELIST_LEAVES, keccak256);
// const advisorMerkleTree = new MerkleTree(ADVISOR_LEAVES, keccak256);

// const generateMerkleRoot = (tree: MerkleTree) => {
//   const hex = tree.getHexRoot();

//   return hex;
// };

// const whitelistMerkleRoot = generateMerkleRoot(whitelistMerkleTree);
// const advisorMerkleRoot = generateMerkleRoot(advisorMerkleTree);

// const generateWhitelistMerkleProof = (leaf: string, index: number) => {
//   return whitelistMerkleTree.getHexProof(leaf, index);
// };

// const generateAdvisorMerkleProof = (leaf: string, index: number) => {
//   return advisorMerkleTree.getHexProof(leaf, index);
// };

export // WHITELIST_LEAVES,
// ADVISOR_LEAVES,
// whitelistMerkleRoot,
// advisorMerkleRoot,
// generateWhitelistMerkleProof,
// generateAdvisorMerkleProof,
 {};
