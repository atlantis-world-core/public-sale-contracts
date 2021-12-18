import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { useMerkleHelper } from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";
import { Sale } from "../typechain";
import { testSetup } from "./utils";
import { DeployContractsFunction, TestSetupArgs } from "./utils/types";
import MerkleTree from "merkletreejs";

describe("ScrollContract", () => {
  const merkleHelper = useMerkleHelper();

  // contracts
  let saleContract: Sale;

  // helper
  let deployContracts: DeployContractsFunction;

  // sale timestamps
  let startSaleBlockTimestamp: BigNumber = toUnixTimestamp("2021-12-31");
  let stopSaleBlockTimestamp: BigNumber = toUnixTimestamp("2022-01-31");

  // signers
  let whitelistSigners: SignerWithAddress[];
  let advisorSigners: SignerWithAddress[];
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let advisor: SignerWithAddress;

  // leaves
  let whitelistLeaves: string[];
  let advisorLeaves: string[];

  // merkle trees
  let whitelistMerkleTree: MerkleTree;
  let advisorMerkleTree: MerkleTree;

  // merkle roots
  let whitelistMerkleRoot: string;
  let advisorMerkleRoot: string;

  // merkle proofs
  const validWhitelistProof = (_leaf?: string): string[] => {
    const [, leaf] = whitelistLeaves;
    const hash = ethers.utils.keccak256(_leaf ?? leaf);
    const proof = merkleHelper.createMerkleProof(whitelistMerkleTree, hash);
    return proof;
  };
  const validAdvisorProof = (_leaf?: string): string[] => {
    const [leaf] = advisorLeaves;
    const hash = ethers.utils.keccak256(_leaf ?? leaf);
    const proof = merkleHelper.createMerkleProof(advisorMerkleTree, hash);
    return proof;
  };
  const invalidMerkleProof = (): string[] => [];

  // ether
  const validMintPayment = ethers.utils.parseEther("0.2");
  const invalidMintPayment = ethers.utils.parseEther("0.01");

  const setup = async (args?: TestSetupArgs) => {
    const {
      owner: _owner,
      minter: _minter,
      advisor: _advisor,
      advisorLeaves: _advisorLeaves,
      advisorMerkleRoot: _advisorMerkleRoot,
      advisorMerkleTree: _advisorMerkleTree,
      whitelistLeaves: _whitelistLeaves,
      whitelistMerkleRoot: _whitelistMerkleRoot,
      whitelistMerkleTree: _whitelistMerkleTree,
      deployContracts: _deployContracts,
    } = await testSetup();

    owner = _owner;
    minter = _minter;
    advisor = _advisor;
    advisorLeaves = _advisorLeaves;
    advisorMerkleRoot = _advisorMerkleRoot;
    advisorMerkleTree = _advisorMerkleTree;
    whitelistLeaves = _whitelistLeaves;
    whitelistMerkleRoot = _whitelistMerkleRoot;
    whitelistMerkleTree = _whitelistMerkleTree;
    deployContracts = _deployContracts;

    // Sale contract deploy
    const { saleContract: _saleContract } = await deployContracts(
      args?.saleStart ?? startSaleBlockTimestamp,
      args?.saleStop ?? stopSaleBlockTimestamp
    );

    // connect as a minter
    saleContract = _saleContract.connect(minter);
  };

  beforeEach(async () => await setup());
});
