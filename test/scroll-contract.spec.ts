import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
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
      // TODO: Make this test pass, currently a failing test
      // AssertionError: Expected transaction to be reverted with Hey, but 
      // other exception was thrown: Error: VM Exception while processing 
      // transaction: reverted with reason string 'AccessControl: account 
      // 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 is missing role 
      // 0x9f566e66e3fe95040f2178cc6bf558ca13dd7af2eac028523bbf86acda6b390f'
      
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

      // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 == 0x0000000000000000000000000000000000000000
      // the deployed proxy contract does not have an owner, it's a zero address
      console.log(owner.address, "==", scrollContractOwner);

      await expect(
        scrollContract.setRoyalties(
          BigNumber.from(1),
          royalty.address,
          BigNumber.from(50),
          { from: owner.address }
        )
      ).to.be.revertedWith("EHEHEHE");
    });
  });
});
