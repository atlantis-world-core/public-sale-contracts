import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Sale } from "../typechain";
import {
  getAdvisorMerkleRoot,
  getWhitelistMerkleRoot,
} from "../helpers/merkle";

function toUnixTimestamp(date: string): BigNumber {
  return BigNumber.from(new Date(date).getTime() / 1000);
}

describe("Sale", () => {
  let contract: Sale;
  const whitelistMerkleRoot = getWhitelistMerkleRoot();
  const advisorMerkleRoot = getAdvisorMerkleRoot();
  const startSaleBlockTimestamp = toUnixTimestamp("2021-12-31");
  const stopSaleBlockTimestamp = toUnixTimestamp("2022-01-31");

  beforeEach(async () => {
    const SaleContract = await ethers.getContractFactory("Sale");

    console.log("beforeEach", {
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp,
    });

    contract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp
    );
    await contract.deployed();
  });

  describe("property: mintPrice", () => {
    it("should return 0.2 ether", async () => {
      const mintPrice = await contract.mintPrice();

      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("property: startSaleBlockTimestamp", () => {
    /** @todo */
  });

  describe("property: stopSaleBlockTimestamp", () => {
    /** @todo */
  });

  describe("property: startKeyToScrollSwap", () => {
    /** @todo */
  });

  describe("modifier: isSaleOngoing", () => {
    /** @todo */
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
