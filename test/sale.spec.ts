import {
  advisorMerkleRoot,
  generateWhitelistMerkleProof,
  whitelistMerkleRoot,
  WHITELIST_LEAVES,
} from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Sale } from "../typechain";

describe("Sale", () => {
  let contract: Sale;
  let startSaleBlockTimestamp = toUnixTimestamp("2021-12-31");
  let stopSaleBlockTimestamp = toUnixTimestamp("2022-01-31");

  async function deploy() {
    const SaleContract = await ethers.getContractFactory("Sale");
    contract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp
    );
    await contract.deployed();
  }

  beforeEach(deploy);

  describe("property: mintPrice", () => {
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await contract.mintPrice();

      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("modifier: isSaleOngoing", () => {
    beforeEach(async () => {
      startSaleBlockTimestamp = toUnixTimestamp("2020-12-31");
      stopSaleBlockTimestamp = toUnixTimestamp("2021-01-31");
      await deploy();
    });

    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale timeframe is from the past`, async () => {
      const [_startSaleBlockTimestamp, _stopSaleBlockTimestamp] =
        await Promise.all([
          contract.startSaleBlockTimestamp(),
          contract.stopSaleBlockTimestamp(),
        ]);

      const [leaf] = WHITELIST_LEAVES;
      const proof = generateWhitelistMerkleProof(leaf, 0);

      expect(_startSaleBlockTimestamp).to.be.equal(startSaleBlockTimestamp);
      expect(_stopSaleBlockTimestamp).to.be.equal(stopSaleBlockTimestamp);
      await expect(contract.buyKeyFromSale(proof)).to.be.reverted;
      await expect(contract.buyKeyFromSale(proof)).to.be.revertedWith(
        "Sale is over"
      );
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
