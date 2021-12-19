import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
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
  let royalty: SignerWithAddress;

  const setup = async () => {
    const {
      signers,
      owner: _owner,
      deployContracts: _deployContracts,
    } = await testSetup();
    const [, , , , , , _royalty] = signers;

    owner = _owner;
    royalty = _royalty;
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

      expect(deployerAddress).to.be.eq(ownerAddress);
    });
  });

  describe("setTokenURI", () => {
    // TODO: Write a unit test to test against onlyOwner modifier
  });

  describe("setRoyalties", () => {
    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN the caller is NOT the owner/deployer of the contract`, async () => {
      scrollContract = scrollContract.connect(royalty);

      await expect(
        scrollContract.setRoyalties(
          BigNumber.from(1),
          royalty.address,
          BigNumber.from(50)
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`SHOULD NOT revert, WHEN the caller is the owner/deployer of the contract`, async () => {
      // TODO: Make this test pass, currently a failing test

      scrollContract = scrollContract.connect(owner);

      const scrollContractOwner = await scrollContract.owner();

      expect(scrollContractOwner).to.be.equal(owner.address);

      await expect(
        scrollContract.setRoyalties(
          BigNumber.from(1),
          royalty.address,
          BigNumber.from(50),
          { from: owner.address }
        )
      ).to.emit(scrollContract, "RoyaltiesSet");
    });
  });
});
