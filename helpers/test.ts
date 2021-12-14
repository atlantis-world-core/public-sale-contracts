import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { useMerkleHelper } from "./merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "./time";
import { ADVISOR_WHITELISTED_USERS, WHITELISTED_USERS } from "./whitelist";

export type SetupArgs = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};

export async function useSaleContractHelper(args?: SetupArgs) {
  const { saleStart, saleStop } = args ?? {};
  const merkleHelper = useMerkleHelper();

  // signers
  const signers = await ethers.getSigners();
  // const _signers = new MockProvider().getWallets()
  const [owner, minter] = signers;
  const whitelistSigners = signers.splice(0, 8);
  const advisorSigners = signers.splice(8, 8);

  // leaves
  const useEthersJsSigners = true;
  const leafZeroPad = (leaf: string) => ethers.utils.hexZeroPad(leaf, 32);
  const whitelistLeaves = (
    useEthersJsSigners
      ? whitelistSigners.map((signer) => signer.address)
      : WHITELISTED_USERS
  ).map(leafZeroPad);
  const advisorLeaves = (
    useEthersJsSigners
      ? advisorSigners.map((signer) => signer.address)
      : ADVISOR_WHITELISTED_USERS
  ).map(leafZeroPad);

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

  // smart contract deployment
  const SaleContract = await ethers.getContractFactory("Sale", {
    signer: owner,
  });
  const contract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    startSaleBlockTimestamp,
    stopSaleBlockTimestamp
  );

  await contract.deployed();

  /**
   * @description
   * Just logs the timestamps from the smart contract.
   */
  async function logTimestamps() {
    const [_startSaleBlockTimestamp, _stopSaleBlockTimestamp] =
      await Promise.all([
        contract.startSaleBlockTimestamp(),
        contract.stopSaleBlockTimestamp(),
      ]);
    const blockTimestamp = await contract.getTimestamp();
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
    contract,
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
