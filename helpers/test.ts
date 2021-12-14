import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { useMerkleHelper } from "./merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "./time";
import { ADVISOR_WHITELISTED_USERS, WHITELISTED_USERS } from "./whitelist";
import { deployMockContract } from "@ethereum-waffle/mock-contract";

import PublicSaleContractABI from "../artifacts/contracts/Sale.sol/PublicSaleContract.json";
import KeysContractABI from "../artifacts/contracts/Keys.sol/KeysContract.json";
import ScrollContractABI from "../artifacts/contracts/Scroll.sol/ScrollContract.json";

export type TestHelperHook = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};

export async function useTestHelper(args?: TestHelperHook) {
  const { saleStart, saleStop } = args ?? {};
  const merkleHelper = useMerkleHelper();

  // signers
  const signers = await ethers.getSigners();
  const [owner, minter] = signers;
  const whitelistSigners = signers.splice(0, 8);
  const advisorSigners = signers.splice(8, 8);

  // leaves
  const useEthersJsSigners = true;
  const whitelistLeaves = useEthersJsSigners
    ? whitelistSigners.map((signer) => signer.address)
    : WHITELISTED_USERS;
  const advisorLeaves = useEthersJsSigners
    ? advisorSigners.map((signer) => signer.address)
    : ADVISOR_WHITELISTED_USERS;

  // merkle trees
  const whitelistMerkleTree = merkleHelper.createMerkleTree(whitelistLeaves);
  const advisorMerkleTree = merkleHelper.createMerkleTree(advisorLeaves);

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  // sale timestamps
  const startSaleBlockTimestamp = saleStart ?? toUnixTimestamp("2021-12-31");
  const stopSaleBlockTimestamp = saleStop ?? toUnixTimestamp("2022-01-31");

  // Sale contract deploy
  const SaleContract = await ethers.getContractFactory("PublicSaleContract", {
    signer: owner,
  });
  const saleContract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    startSaleBlockTimestamp,
    stopSaleBlockTimestamp
  );
  const mockSaleContract = await deployMockContract(owner, PublicSaleContractABI.abi);
  await saleContract.deployed();

  // Keys contract deploy
  const KeysContract = await ethers.getContractFactory("KeysContract");
  const keysContract = await KeysContract.deploy(saleContract.address);
  const mockKeysContract = await deployMockContract(owner, KeysContractABI.abi);
  await keysContract.deployed();
  await saleContract.setKeysAddress(keysContract.address);

  // ScrollContract deploy
  const ScrollContract = await ethers.getContractFactory("ScrollContract");
  const scrollContract = await ScrollContract.deploy();
  const mockScrollsContract = await deployMockContract(
    owner,
    ScrollContractABI.abi
  );
  await scrollContract.deployed();
  await saleContract.setScollAddress(scrollContract.address);

  /**
   * @description
   * Just logs the timestamps from the smart contract.
   */
  async function logTimestamps() {
    const [_startSaleBlockTimestamp, _stopSaleBlockTimestamp] =
      await Promise.all([
        saleContract.startSaleBlockTimestamp(),
        saleContract.stopSaleBlockTimestamp(),
      ]);
    const blockTimestamp = await saleContract.getTimestamp();
    console.log("[logTimestamps] ⌚ logging timestamps", {
      blockTimestamp: fromUnixTimestamp(blockTimestamp).toLocaleDateString(),
      _startSaleBlockTimestamp: fromUnixTimestamp(
        _startSaleBlockTimestamp
      ).toLocaleDateString(),
      _stopSaleBlockTimestamp: fromUnixTimestamp(
        _stopSaleBlockTimestamp
      ).toLocaleDateString(),
    });
  }

  return {
    saleContract,
    mockSaleContract,
    keysContract,
    mockKeysContract,
    scrollContract,
    mockScrollsContract,
    owner,
    minter,
    whitelistMerkleTree,
    advisorMerkleTree,
    whitelistMerkleRoot,
    advisorMerkleRoot,
    whitelistLeaves,
    advisorLeaves,
    startSaleBlockTimestamp,
    stopSaleBlockTimestamp,
    logTimestamps,
  };
}
