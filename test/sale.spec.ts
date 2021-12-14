import { useMerkleHelper } from "../helpers/merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ADVISOR_WHITELISTED_USERS,
  WHITELISTED_USERS,
} from "../helpers/whitelist";
import { BigNumber } from "@ethersproject/bignumber";

type SetupArgs = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};

async function setup(args?: SetupArgs) {
  const { saleStart, saleStop } = args ?? {};
  const merkleHelper = useMerkleHelper();

  // signers
  const signers = await ethers.getSigners();
  // const _signers = new MockProvider().getWallets()
  const [owner, minter] = signers;

  // leaves
  const useEtherSigners = true;
  const leafZeroPad = (leaf: string) => ethers.utils.hexZeroPad(leaf, 32);
  const whitelistLeaves = (
    useEtherSigners
      ? signers.map((signer) => signer.address).splice(0, 8)
      : WHITELISTED_USERS
  ).map(leafZeroPad);
  const advisorLeaves = (
    useEtherSigners
      ? signers.map((signer) => signer.address).splice(8, 8)
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

/**
 * @todo
 * The timestamps should not be relative, should be replaced with a
 * library where you can add days, weeks, months, and years. Where
 * it's not going to be relative to the current timestamp when the
 * test is being executed. Otherwise tests would fail at some time.
 */
describe("Sale", () => {
  const merkleHelper = useMerkleHelper();

  describe("property: mintPrice", () => {
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      // arrange
      const { contract } = await setup();

      // act
      const mintPrice = await contract.mintPrice();

      // assert
      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("modifier: isSaleOngoing", () => {
    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale timeframe is from the past`, async () => {
      // arrange
      const startSaleBlockTimestamp = toUnixTimestamp("2020-12-31");
      const stopSaleBlockTimestamp = toUnixTimestamp("2021-01-31");
      const { contract, whitelistLeaves, whitelistMerkleTree } = await setup({
        saleStart: startSaleBlockTimestamp,
        saleStop: stopSaleBlockTimestamp,
      });

      // act
      const [leaf] = whitelistLeaves;
      const proof = merkleHelper.createMerkleProof(whitelistMerkleTree, leaf);
      console.log(whitelistLeaves.length, proof);

      // assert
      await expect(contract.buyKeyFromSale(proof)).to.be.reverted;
      await expect(contract.buyKeyFromSale(proof)).to.be.revertedWith(
        "Sale is over"
      );
    });

    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      // arrange
      const { contract, minter, whitelistLeaves, whitelistMerkleTree } =
        await setup();

      // act
      const [leaf] = whitelistLeaves;
      const proof = merkleHelper.createMerkleProof(
        whitelistMerkleTree,
        leaf,
        0
      );
      const ether = ethers.utils.parseEther("0.2");
      contract.connect(minter);

      // assert
      await expect(
        contract.buyKeyFromSale(proof, {
          value: ether,
        })
      ).to.be.revertedWith("hey");
      await expect(contract.buyKeyFromSale(proof)).to.be.not.reverted;
    });
  });

  describe("modifier: hasSaleEnded", () => {
    /** @todo */
  });

  describe("modifier: canKeySwapped", () => {
    /** @todo */
  });

  describe("function: generateLeaf", () => {
    /** @todo */
  });

  describe("function: preMint", () => {
    /** @todo */
  });

  describe("function: buyKeyFromSale", () => {
    /** @todo */
  });

  describe("function: buyPostSale", () => {
    /** @todo */
  });

  describe("function: sellKeyForScroll", () => {
    /** @todo */
  });

  describe("function: setWhiteListMerkleRoot", () => {
    /** @todo */
  });

  describe("function: setAdvisorMerkleRoot", () => {
    /** @todo */
  });

  describe("function: setKeysAddress", () => {
    /** @todo */
  });

  describe("function: setScollAddress", () => {
    /** @todo */
  });
});
