import { useMerkleHelper } from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { useTestHelper } from "../helpers/test";

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
      const { saleContract } = await useTestHelper();

      // act
      const mintPrice = await saleContract.mintPrice();

      // assert
      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("modifier: isSaleOngoing", () => {
    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale timeframe is from the past`, async () => {
      // arrange
      const startSaleBlockTimestamp = toUnixTimestamp("2020-12-31");
      const stopSaleBlockTimestamp = toUnixTimestamp("2021-01-31");
      const { saleContract, whitelistLeaves, whitelistMerkleTree } =
        await useTestHelper({
          saleStart: startSaleBlockTimestamp,
          saleStop: stopSaleBlockTimestamp,
        });

      // act
      const [leaf] = whitelistLeaves;
      const hashedLeaf = ethers.utils.keccak256(leaf);
      const proof = merkleHelper.createMerkleProof(
        whitelistMerkleTree,
        hashedLeaf
      );

      // assert
      await expect(saleContract.buyKeyFromSale(proof)).to.be.reverted;
      await expect(saleContract.buyKeyFromSale(proof)).to.be.revertedWith(
        "Sale is over"
      );
    });

    // TODO: Test case shouldn't be here
    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      // arrange
      const {
        saleContract,
        minter,
        whitelistLeaves,
        whitelistMerkleTree,
        // logTimestamps,
      } = await useTestHelper({
        saleStart: toUnixTimestamp("2020-12-05"),
      });

      // act
      const _saleContract = saleContract.connect(minter);
      const ether = ethers.utils.parseEther("0.2");
      const [, minterLeaf] = whitelistLeaves;
      const hashedLeaf = ethers.utils.keccak256(minterLeaf);
      const proof = merkleHelper.createMerkleProof(
        whitelistMerkleTree,
        hashedLeaf
      );
      // await logTimestamps();

      // assert
      await expect(
        _saleContract.buyKeyFromSale(proof, {
          from: minter.address,
          value: ether,
        })
      ).to.be.revertedWith("TEMPORARY");
      await expect(_saleContract.buyKeyFromSale(proof)).to.be.not.reverted;
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
