import { useMerkleHelper } from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Sale } from "../typechain";
import { BigNumber } from "@ethersproject/bignumber";
import { testSetup } from "./utils";
import { DeployContractsFunction, TestSetupArgs } from "./utils/types";
import MerkleTree from "merkletreejs";
import {
  bigNumberToBlockTimestamp,
  BLOCK_ONE_DAY,
  BLOCK_ONE_WEEK,
  getCurrentBlockTimestamp,
} from "../utils";

describe("Sale", async () => {
  const merkleHelper = useMerkleHelper();

  // contracts
  let saleContract: Sale;

  // helper

  let deployContracts: DeployContractsFunction;

  let startSaleBlockTimestamp: BigNumber = BigNumber.from(
    (await ethers.provider.getBlock(await ethers.provider.getBlockNumber()))
      .timestamp
  );

  // sale timestamps

  // signers
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let advisor: SignerWithAddress;

  // leaves
  let whitelistLeaves: string[];
  let advisorLeaves: string[];

  // merkle trees
  let whitelistMerkleTree: MerkleTree;
  let advisorMerkleTree: MerkleTree;

  // merkle roots
  let whitelistMerkleRoot: string;
  let advisorMerkleRoot: string;

  // merkle proofs
  const validWhitelistProof = (_leaf?: string): string[] => {
    const [, leaf] = whitelistLeaves;
    const hash = ethers.utils.keccak256(_leaf ?? leaf);
    const proof = merkleHelper.createMerkleProof(whitelistMerkleTree, hash);
    return proof;
  };
  const validAdvisorProof = (_leaf?: string): string[] => {
    const [leaf] = advisorLeaves;
    const hash = ethers.utils.keccak256(_leaf ?? leaf);
    const proof = merkleHelper.createMerkleProof(advisorMerkleTree, hash);
    return proof;
  };
  const invalidMerkleProof = (): string[] => [];

  // ether
  const validMintPayment = ethers.utils.parseEther("0.2");
  const invalidMintPayment = ethers.utils.parseEther("0.01");

  const setup = async (args?: TestSetupArgs) => {
    const {
      owner: _owner,
      minter: _minter,
      advisor: _advisor,
      advisorLeaves: _advisorLeaves,
      advisorMerkleRoot: _advisorMerkleRoot,
      advisorMerkleTree: _advisorMerkleTree,
      whitelistLeaves: _whitelistLeaves,
      whitelistMerkleRoot: _whitelistMerkleRoot,
      whitelistMerkleTree: _whitelistMerkleTree,
      deployContracts: _deployContracts,
    } = await testSetup();

    owner = _owner;
    minter = _minter;
    advisor = _advisor;
    advisorLeaves = _advisorLeaves;
    advisorMerkleRoot = _advisorMerkleRoot;
    advisorMerkleTree = _advisorMerkleTree;
    whitelistLeaves = _whitelistLeaves;
    whitelistMerkleRoot = _whitelistMerkleRoot;
    whitelistMerkleTree = _whitelistMerkleTree;
    deployContracts = _deployContracts;

    const now = await getCurrentBlockTimestamp();
    const start = bigNumberToBlockTimestamp(now) + BLOCK_ONE_DAY;

    // Sale contract deploy
    const { saleContract: _saleContract, scrollContract: _scrollContract } =
      await deployContracts(
        BigNumber.from(start),
        BigNumber.from(start + BLOCK_ONE_WEEK)
      );

    // connect as a minter
    saleContract = _saleContract.connect(minter);
  };

  beforeEach(async () => {
    await setup();
  });

  describe("mintPrice", () => {
    // a very basic test, just so we can easily confirm the test setup is working as expected
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await saleContract.MINT_PRICE();

      // assert
      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("buyKeyFromSale", () => {
    it(`SHOULD revert with "Insufficient payment", WHEN GIVEN an invalid mint price AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: invalidMintPayment,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(invalidMerkleProof(), overrides)
      ).to.be.revertedWith("Insufficient payment");
    });

    it(`SHOULD revert with "Not eligible", WHEN GIVEN an invalid merkle proof AND the sale is still on-going`, async () => {
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_DAY * 3]);
      await ethers.provider.send("evm_mine", []);

      const badMerkleProof: string[] = [];
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(badMerkleProof, overrides)
      ).to.be.revertedWith("Not eligible");
    });

    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_DAY * 3]);
      await ethers.provider.send("evm_mine", []);
      // assert
      await expect(
        saleContract.buyKeyFromSale(validWhitelistProof(), {
          from: minter.address,
          value: validMintPayment,
        })
      ).to.emit(saleContract, "KeyWhitelistMinted").and.to.be.not.reverted;
    });

    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale time range is from the past`, async () => {
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_WEEK * 3]);
      await ethers.provider.send("evm_mine", []);

      const proof = validWhitelistProof();
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(proof, overrides)
      ).to.be.revertedWith("Sale is over");
    });
  });

  describe("buyKeyPostSale", async () => {
    let hash: any;
    let signature: any;

    before(async () => {
      hash = ethers.utils.keccak256("0x01");
      signature = await owner.signMessage(hash);
    });

    it(`SHOULD revert with "Insufficient payment", WHEN the sale timeframe is still over AND mint payment is NOT 0.2 ether`, async () => {
      // arrange

      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: invalidMintPayment,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(hash, signature, overrides)).to
        .be.reverted;
      await expect(
        saleContract.buyKeyPostSale(hash, signature, overrides)
      ).to.be.revertedWith("Insufficient payment");
    });

    it(`SHOULD revert with "Sale is ongoing", WHEN the sale timeframe is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(hash, signature, overrides)).to
        .be.reverted;
      await expect(
        saleContract.buyKeyPostSale(hash, signature, overrides)
      ).to.be.revertedWith("Sale is ongoing");
    });

    
    // TODO: @rachit2501 this needs to get fixed
    // Exception
    // AssertionError: Expected transaction to be reverted with Sale is ongoing,
    // but other exception was thrown: Error: VM Exception while processing transaction: 
    // reverted with reason string 'Signature Verification Failed'
    it(`SHOULD NOT revert with "Sale is ongoing", WHEN the sale timeframe is over`, async () => {
      await ethers.provider.send("evm_increaseTime", [BLOCK_ONE_WEEK * 3]);
      await ethers.provider.send("evm_mine", []);
      
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      // await expect(saleContract.buyKeyPostSale(hash, signature, overrides)).not
      //   .to.be.reverted;
      // await expect(
      //   saleContract.buyKeyPostSale(hash, signature, overrides)
      // ).not.to.be.revertedWith("Sale is ongoing");

      // TODO: To remove this and uncomment assertion above
      // this was meant to have a wrong assertion to reveal the exception 
      // message above
      await expect(
        saleContract.buyKeyPostSale(hash, signature, overrides)
      ).to.be.revertedWith("Sale is ongoing");
    });
  });

  describe("sellKeyForScroll", () => {
    let hash: any;
    let signature: any;
    before(async () => {
      hash = ethers.utils.solidityKeccak256(["string"], ["1"]);
      signature = await owner.signMessage(ethers.utils.arrayify(hash));
    });
    it(`SHOULD revert with "A date for swapping hasn't been set", WHEN the startKeyToScrollSwapTimestamp is not set`, async () => {
      // arrange

      saleContract = saleContract.connect(owner);
      const overrides = {
        from: owner.address,
      };
      console.log("checking the ownershjip", owner.address, signature, hash);
      // act
      await Promise.all([
        saleContract.buyKeyPostSale(hash, signature, {
          ...overrides,
          value: validMintPayment,
        }),
      ]);

      // assert
      await expect(
        saleContract.sellKeyForScroll(1, overrides)
      ).to.be.revertedWith("A date for swapping hasn't been set");
    });

    it(`SHOULD revert with "Please wait for the swapping to begin", WHEN the startKeyToScrollSwapTimestamp is not set`, async () => {
      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2023-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale(hash, signature, {
          ...overrides,
          value: validMintPayment,
        }),

        saleContract.setStartKeyToScrollSwapTimestamp(
          keySwappingTimestamp,
          overrides
        ),
      ]);

      // assert
      await expect(
        saleContract.sellKeyForScroll(1, overrides)
      ).to.be.revertedWith("Please wait for the swapping to begin");
    });

    it(`SHOULD revert with "ERC721: owner query for nonexistent token", WHEN the sale timeframe is over AND attempts to burn a key that caller doesn't own`, async () => {
      // arrange

      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2020-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale(hash, signature, {
          ...overrides,
          value: validMintPayment,
        }),

        saleContract.setStartKeyToScrollSwapTimestamp(
          keySwappingTimestamp,
          overrides
        ),
      ]);

      // assert
      await expect(
        saleContract.sellKeyForScroll(5, overrides)
      ).to.be.revertedWith("ERC721: owner query for nonexistent token");
    });

    it(`SHOULD NOT revert with "Please wait for the swapping to begin", WHEN the sale timeframe is over`, async () => {
      // arrange

      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2020-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale(hash, signature, {
          ...overrides,
          value: validMintPayment,
        }),

        saleContract.setStartKeyToScrollSwapTimestamp(
          keySwappingTimestamp,
          overrides
        ),
      ]);

      // assert
      await expect(saleContract.sellKeyForScroll(1, overrides)).not.to.be
        .reverted;
      await expect(
        saleContract.sellKeyForScroll(1, overrides)
      ).not.to.be.revertedWith("Please wait for the swapping to begin");
    });
  });

  describe("preMint", () => {
    it(`SHOULD revert with "Not in the advisory list", WHEN GIVEN an invalid merkle proof AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);
      const overrides = {
        from: advisor.address,
      };

      // act & assert
      await expect(
        saleContract.preMint(invalidMerkleProof(), overrides)
      ).to.be.revertedWith("Not in the advisory list").and.to.be.reverted;
    });

    it(`SHOULD emit event KeyAdvisorMinted AND NOT revert with "Not in the advisory list", WHEN GIVEN a valid merkle proof AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.preMint(validAdvisorProof(advisor.address), {
          from: advisor.address,
        })
      )
        .to.emit(saleContract, "KeyAdvisorMinted")
        .and.not.to.be.revertedWith("Not in the advisory list");
    });

    it(`SHOULD emit event KeyAdvisorMinted AND NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      saleContract = saleContract.connect(advisor);

      // assert
      await expect(
        saleContract.preMint(validAdvisorProof(advisor.address), {
          from: advisor.address,
        })
      ).to.emit(saleContract, "KeyAdvisorMinted").and.to.be.not.reverted;
    });
  });

  describe("setStartKeyToScrollSwapTimestamp", () => {
    it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(
        saleContract.setStartKeyToScrollSwapTimestamp(startSaleBlockTimestamp)
      ).to.emit(saleContract, "NewStartKeyToScrollSwapTimestamp").and.to.be.not
        .reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setStartKeyToScrollSwapTimestamp(startSaleBlockTimestamp)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setWhitelistMerkleRoot", () => {
    it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(saleContract.setWhitelistMerkleRoot(advisorMerkleRoot)).to.be
        .not.reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setWhitelistMerkleRoot(advisorMerkleRoot)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setAdvisorMerkleRoot", () => {
    it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(saleContract.setAdvisorMerkleRoot(whitelistMerkleRoot)).to.be
        .not.reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setAdvisorMerkleRoot(whitelistMerkleRoot)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setKeysAddress", () => {
    it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(saleContract.setKeysAddress(saleContract.address)).to.be.not
        .reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setKeysAddress(saleContract.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`SHOULD revert with "Must not be an empty address", WHEN GIVEN address(0) AND the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(
        saleContract.setKeysAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Must not be an empty address");
    });
  });

  describe("setScollAddress", () => {
    it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(saleContract.setScrollAddress(saleContract.address)).to.be
        .not.reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setScrollAddress(saleContract.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`SHOULD revert with "Must not be an empty address", WHEN GIVEN address(0) AND the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(
        saleContract.setScrollAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Must not be an empty address");
    });
  });
});
