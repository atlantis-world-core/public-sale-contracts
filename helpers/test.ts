import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { useMerkleHelper } from "./merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "./time";
import { ADVISOR_WHITELISTED_USERS, WHITELISTED_USERS } from "./whitelist";

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

  // Sale: smart contract deployment
  const SaleContract = await ethers.getContractFactory("Sale", {
    signer: owner,
  });
  const saleContract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    startSaleBlockTimestamp,
    stopSaleBlockTimestamp
  );
  await smock.mock<MyContract__factory>('MyContract');
  await saleContract.deployed();

  // Keys: smart contract deployment
  const KeysContract = await ethers.getContractFactory("Keys");
  const keysContract = await KeysContract.deploy(saleContract.address);
  await keysContract.deployed();

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
    keysContract,
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
