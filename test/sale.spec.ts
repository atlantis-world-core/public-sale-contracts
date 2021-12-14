import { useMerkleHelper } from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { useSaleContractHelper } from "../helpers/test";

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
      const { contract } = await useSaleContractHelper();

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
      const { contract, whitelistLeaves, whitelistMerkleTree } =
        await useSaleContractHelper({
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
      const {
        contract,
        minter,
        whitelistLeaves,
        whitelistMerkleTree,
        logTimestamps,
      } = await useSaleContractHelper({
        saleStart: toUnixTimestamp("2020-12-05"),
      });

      // act
      const [leaf] = whitelistLeaves;
      const proof = merkleHelper.createMerkleProof(whitelistMerkleTree, leaf);
      const ether = ethers.utils.parseEther("0.2");
      contract.connect(minter);
      await logTimestamps();

      // assert
      await expect(contract.buyKeyFromSale(proof)).to.be.not.reverted;

      // temp, to let it log revert exception message
      await expect(
        contract.buyKeyFromSale(proof, {
          value: ether,
        })
      ).to.be.revertedWith("hey");
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
