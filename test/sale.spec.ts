import { useMerkleHelper } from "../helpers/merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Sale } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import MerkleTree from "merkletreejs";

/**
 * @todo
 * The timestamps should not be relative, should be replaced with a
 * library where you can add days, weeks, months, and years. Where
 * it's not going to be relative to the current timestamp when the
 * test is being executed. Otherwise tests would fail at some time.
 */
describe("Sale", () => {
  const merkleHelper = useMerkleHelper();
  let whitelistLeaves: string[] = [];
  let advisorLeaves: string[];
  let whitelistMerkleTree: MerkleTree;
  let advisorMerkleTree: MerkleTree;
  let whitelistMerkleRoot: string;
  let advisorMerkleRoot: string;
  let signers: SignerWithAddress[];
  let contract: Sale;
  let startSaleBlockTimestamp = toUnixTimestamp("2021-12-31");
  let stopSaleBlockTimestamp = toUnixTimestamp("2022-01-31");

  async function deploy() {
    // signers
    const _signers = await ethers.getSigners();
    const [owner, minter] = _signers;
    signers = [owner, minter];

    // leaves
    whitelistLeaves = _signers.map((signer) => signer.address).splice(0, 8);
    advisorLeaves = _signers.map((signer) => signer.address).splice(8, 8);
    console.log("leaves", {
      whitelistLeaves: whitelistLeaves.length,
      advisorLeaves: advisorLeaves.length,
    });

    // merkle trees
    whitelistMerkleTree = merkleHelper.createMerkleTree(whitelistLeaves);
    advisorMerkleTree = merkleHelper.createMerkleTree(advisorLeaves);

    // merkle roots
    whitelistMerkleRoot = merkleHelper.createMerkleRoot(whitelistMerkleTree);
    advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

    // smart contract deployment
    const SaleContract = await ethers.getContractFactory("Sale", {
      signer: owner,
    });
    contract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp
    );

    await contract.deployed();
  }

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

  beforeEach(deploy);

  describe("property: mintPrice", () => {
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await contract.mintPrice();

      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("modifier: isSaleOngoing", () => {
    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale timeframe is from the past`, async () => {
      // arrange
      startSaleBlockTimestamp = toUnixTimestamp("2020-12-31");
      stopSaleBlockTimestamp = toUnixTimestamp("2021-01-31");
      await deploy();
      await logTimestamps();

      // act
      const [leaf] = whitelistLeaves;
      const proof = merkleHelper.createMerkleProof(
        whitelistMerkleTree,
        leaf,
        0
      );

      // assert
      await expect(contract.buyKeyFromSale(proof)).to.be.reverted;
      await expect(contract.buyKeyFromSale(proof)).to.be.revertedWith(
        "Sale is over"
      );
    });

    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      // arrange
      startSaleBlockTimestamp = toUnixTimestamp("2021-12-01");
      stopSaleBlockTimestamp = toUnixTimestamp("2022-01-31");
      await deploy();
      await logTimestamps();

      // act
      const [leaf] = whitelistLeaves;
      const proof = merkleHelper.createMerkleProof(
        whitelistMerkleTree,
        leaf,
        0
      );
      const ether = ethers.utils.parseEther("0.2");

      // assert
      await expect(
        contract.buyKeyFromSale(proof, {
          // from: minter.address,
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
