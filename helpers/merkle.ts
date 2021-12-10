import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
// eslint-disable-next-line node/no-missing-import
import { list } from "./userWhitelist";

const leaves = list.map((x) => keccak256(x));
const tree = new MerkleTree(leaves, keccak256);

const getRoot = () => {
  return tree.getRoot().toString("hex");
};

const getProof = (leaf) => {
  return tree.getProof(leaf);
};

export { getRoot, getProof, tree };
