import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ethers } from "ethers";
import {
  AtlantisWorldAlphaSale,
  AtlantisWorldFoundingAtlanteanScrolls,
} from "../typechain";
import { testSetup } from "./utils";
import { DeployContractsFunction } from "./utils/types";

describe("AtlantisWorldFoundingAtlanteanScrolls", () => {
  // contracts
  let scrollContract: AtlantisWorldFoundingAtlanteanScrolls;
  let saleContract: AtlantisWorldAlphaSale;
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

    const currentTimestamp = (
      await ethers
        .getDefaultProvider()
        .getBlock(await ethers.getDefaultProvider().getBlockNumber())
    ).timestamp;

    // Sale contract deploy
    const { saleContract: _saleContract, scrollContract: _scrollContract } =
      await deployContracts(
        BigNumber.from(parseInt((currentTimestamp + 1000).toString())),
        BigNumber.from(parseInt((currentTimestamp + 1000 + 5184000).toString()))
      );
    saleContract = _saleContract;
    scrollContract = _scrollContract as AtlantisWorldFoundingAtlanteanScrolls;
    scrollContract = scrollContract.connect(owner);
  };
  beforeEach(async () => await setup());

  // test simple enough just to check if the test setup works
  it("scrollContract.signer.getAddress: SHOULD be the owner address, WHEN called", async () => {
    const deployerAddress = await scrollContract.signer.getAddress();
    const ownerAddress = owner.address;
    expect(deployerAddress).to.be.eq(ownerAddress);
  });

  it(`setRaribleRoyalties: SHOULD revert with "Ownable: caller is not the owner", WHEN the caller is NOT the owner/deployer of the contract`, async () => {
    scrollContract = scrollContract.connect(royalty);
    await expect(
      scrollContract.setRaribleRoyalties(
        BigNumber.from(1),
        royalty.address,
        BigNumber.from(50)
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
  it(`setRaribleRoyalties: SHOULD NOT revert, WHEN the caller is the owner/deployer of the contract`, async () => {
    // TODO: Make this test pass, currently a failing test
    scrollContract = scrollContract.connect(owner);
    const scrollContractOwner = await scrollContract.owner();
    expect(scrollContractOwner).to.be.equal(owner.address);
    await expect(
      scrollContract.setRaribleRoyalties(
        BigNumber.from(1),
        royalty.address,
        BigNumber.from(50),
        { from: owner.address }
      )
    ).to.emit(scrollContract, "RoyaltiesSet");
  });
});
