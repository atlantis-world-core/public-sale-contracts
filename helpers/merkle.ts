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
    const hash = ethers.utils.keccak256(leaf);

    return tree.getHexProof(hash, index);
  };

  const createMerkleRoot = (tree: MerkleTree): string => tree.getHexRoot();

  return {
    createMerkleTree,
    createMerkleProof,
    createMerkleRoot,
  };
};
