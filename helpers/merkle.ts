import { ADVISOR_WHITELISTED_USERS, WHITELISTED_USERS } from "./whitelist";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const whitelistLeaves = WHITELISTED_USERS.map((x) => keccak256(x));
const advisorLeaves = ADVISOR_WHITELISTED_USERS.map((x) => keccak256(x));
const whitelistTree = new MerkleTree(whitelistLeaves, keccak256);
const advisorTree = new MerkleTree(advisorLeaves, keccak256);

const getWhitelistMerkleRoot = () => {
  return "0x" + whitelistTree.getRoot().toString("hex");
};

const getWhitelistMerkleProof = (leaf: string) => {
  return whitelistTree.getProof(leaf);
};

const getAdvisorMerkleRoot = () => {
  return "0x" + advisorTree.getRoot().toString("hex");
};

const getAdvisorMerkleProof = (leaf: string) => {
  return advisorTree.getProof(leaf);
};

export {
  getWhitelistMerkleRoot,
  getWhitelistMerkleProof,
  getAdvisorMerkleRoot,
  getAdvisorMerkleProof,
  whitelistLeaves,
  advisorLeaves,
  whitelistTree,
  advisorTree,
};
