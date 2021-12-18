import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { testSetup } from "./utils";
import { DeployContractsFunction, TestSetupArgs } from "./utils/types";

describe("ScrollContract", () => {
  let scrollContract: Contract;

  // helper
  let deployContracts: DeployContractsFunction;

  // signers
  let owner: SignerWithAddress;

  const setup = async (args?: TestSetupArgs) => {
    const { owner: _owner, deployContracts: _deployContracts } =
      await testSetup();

    owner = _owner;
    deployContracts = _deployContracts;

    // Sale contract deploy
    const { scrollContract: _scrollContract } = await deployContracts();

    scrollContract = _scrollContract;
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
    // 
  })

  describe("setTokenURI", () => {
    // 
  })

  describe("setRoyalties", () => {
    // 
  })
});
