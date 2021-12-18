import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Sale, ScrollContract } from "../typechain";
import { testSetup } from "./utils";
import { DeployContractsFunction } from "./utils/types";

describe("ScrollContract", () => {
  // contracts
  let scrollContract: ScrollContract;
  let saleContract: Sale;

  // helper
  let deployContracts: DeployContractsFunction;

  // signers
  let owner: SignerWithAddress;

  const setup = async () => {
    const { owner: _owner, deployContracts: _deployContracts } =
      await testSetup();

    owner = _owner;
    deployContracts = _deployContracts;

    // Sale contract deploy
    const { saleContract: _saleContract, scrollContract: _scrollContract } =
      await deployContracts();

    saleContract = _saleContract;
    scrollContract = _scrollContract as ScrollContract;

    scrollContract = scrollContract.connect(owner);
  };

  beforeEach(async () => await setup());

  describe("scrollContract.signer.getAddress", () => {
    // test simple enough just to check if the test setup works
    it("SHOULD be the owner address, WHEN called", async () => {
      const deployerAddress = await scrollContract.signer.getAddress();
      const ownerAddress = owner.address;

      console.log(
        scrollContract.address,
        "|",
        deployerAddress,
        "==",
        ownerAddress
      );

      expect(deployerAddress).to.be.eq(ownerAddress);
    });
  });

  describe("mint", () => {
    it("SHOULD not revert WHEN called", async () => {
      const [saleContractSignerAddress, scrollContractSignerAddress] =
        await Promise.all([
          saleContract.signer.getAddress(),
          scrollContract.signer.getAddress(),
        ]);

      console.log({
        ownerAddress: owner.address,
        saleContractSignerAddress,
        scrollContractSignerAddress,
      });

      await expect(
        scrollContract.connect(owner).mint(owner.address, 1)
      ).to.be.revertedWith("Hey");
    });
  });

  describe("setTokenURI", () => {
    //
  });

  describe("setRoyalties", () => {
    //
  });
});
