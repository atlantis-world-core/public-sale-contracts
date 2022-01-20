import { useMerkleHelper } from "../helpers/merkle";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockWETH, Sale } from "../typechain";
import { BigNumber } from "@ethersproject/bignumber";
import { testSetup } from "./utils";
import { DeployContractsFunction, TestSetupArgs } from "./utils/types";
import MerkleTree from "merkletreejs";

describe("Sale", async () => {
  const merkleHelper = useMerkleHelper();

  // contracts
  let saleContract: Sale;
  let wethContract: MockWETH;

  // helper

  let deployContracts: DeployContractsFunction;

  const startSaleBlockTimestamp: BigNumber = BigNumber.from(
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
  const validMintPayment = ethers.utils.parseEther("0.22");

  const setup = async (args?: any) => {
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

    const currentTimestamp = (
      await ethers
        .getDefaultProvider()
        .getBlock(await ethers.getDefaultProvider().getBlockNumber())
    ).timestamp;

    // Sale contract deploy
    const { saleContract: _saleContract, wethContract: _wethContract } =
      await deployContracts(
        BigNumber.from(
          parseInt((currentTimestamp + 1000 + args.offset).toString())
        ),
        BigNumber.from(
          parseInt((currentTimestamp + 1000 + args.offset + 5184000).toString())
        )
      );

    // connect as a minter
    saleContract = _saleContract.connect(minter);
    wethContract = _wethContract;
  };

  describe("mintPrice", () => {
    beforeEach(async () => await setup({ offset: 0 }));
    // a very basic test, just so we can easily confirm the test setup is working as expected
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await saleContract.MINT_PRICE();

      // assert
      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.22");
    });
  });

  describe("advisoryMint", () => {
    before(async () => await setup({ offset: 0 }));
    it(`SHOULD revert with "Not in the advisory list", WHEN GIVEN an invalid merkle proof AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);
      const overrides = {
        from: advisor.address,
      };

      // act & assert
      await expect(
        saleContract.advisoryMint(invalidMerkleProof(), overrides)
      ).to.be.revertedWith("Not in the advisory list").and.to.be.reverted;
    });

    it(`SHOULD emit event KeyAdvisorMinted AND NOT revert with "Not in the advisory list", WHEN GIVEN a valid merkle proof AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.advisoryMint(validAdvisorProof(advisor.address), {
          from: advisor.address,
        })
      )
        .to.emit(saleContract, "KeyAdvisorMinted")
        .and.not.to.be.revertedWith("Not in the advisory list");
    });
  });

  describe("buyKeyFromSale", () => {
    before(async () => await setup({ offset: 0 }));

    it(`SHOULD revert with "Not eligible", WHEN GIVEN an invalid merkle proof AND the sale is still on-going`, async () => {
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine", []);

      const badMerkleProof: string[] = [];
      const overrides = {
        from: minter.address,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(badMerkleProof, overrides)
      ).to.be.revertedWith("Not eligible");
    });

    it(`SHOULD revert with "ERC20: transfer amount exceeds balance", WHEN GIVEN an invalid mint price AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(validWhitelistProof(), overrides)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      await wethContract.mint(minter.address, "20000000000000000000000000000");
      await wethContract
        .connect(minter)
        .approve(saleContract.address, validMintPayment);
      // assert
      await expect(
        saleContract.buyKeyFromSale(validWhitelistProof(), {
          from: minter.address,
        })
      ).to.emit(saleContract, "KeyWhitelistMinted").and.to.be.not.reverted;
    });

    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale time range is from the past`, async () => {
      await ethers.provider.send("evm_increaseTime", [5204000]);
      await ethers.provider.send("evm_mine", []);

      const proof = validWhitelistProof();
      const overrides = {
        from: minter.address,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(proof, overrides)
      ).to.be.revertedWith("Sale is over");
    });
  });

  describe("buyKeyPostSale", async () => {
    before(async () => {
      await setup({ offset: 8000000 }); // evm_mine working inside blockchain, but the result from ethers is not, so adding an offset to fix
    });

    it(`SHOULD revert with "Sale is ongoing", WHEN the sale timeframe is still on-going`, async () => {
      const hash = ethers.utils.solidityKeccak256(["string"], ["1"]);
      const signature = await owner.signMessage(ethers.utils.arrayify(hash));
      // arrange
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
      };

      await expect(
        saleContract.buyKeyPostSale("1", signature, overrides)
      ).to.be.revertedWith("Sale is ongoing");
    });

    it(`SHOULD NOT revert with "Sale is ongoing", WHEN the sale timeframe is over`, async () => {
      await ethers.provider.send("evm_increaseTime", [100000000]);
      await ethers.provider.send("evm_mine", []);

      const hash = ethers.utils.solidityKeccak256(["string"], ["2"]);
      const signature = await owner.signMessage(ethers.utils.arrayify(hash));

      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
      };
      await wethContract.mint(minter.address, "20000000000000000000000000");
      await wethContract
        .connect(minter)
        .approve(saleContract.address, "20000000000000000000000000");

      await expect(
        saleContract.buyKeyPostSale("2", signature, overrides)
      ).not.to.be.revertedWith("Sale is ongoing");
    });

    it(`SHOULD not revert and hash should work`, async () => {
      // arrange

      const hash = ethers.utils.solidityKeccak256(
        ["address", "string"],
        [minter.address, "3"]
      );

      const signature = await owner.signMessage(ethers.utils.arrayify(hash));

      await wethContract.mint(minter.address, "20000000000000000000000000");
      await wethContract
        .connect(minter)
        .approve(saleContract.address, "20000000000000000000000000");

      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
      };

      await expect(saleContract.buyKeyPostSale("3", signature, overrides)).to
        .not.reverted;
    });

    it(`SHOULD revert if nonce already used`, async () => {
      // arrange

      const hash = ethers.utils.solidityKeccak256(
        ["address", "string"],
        [minter.address, "3"]
      );

      const signature = await owner.signMessage(ethers.utils.arrayify(hash));

      await wethContract.mint(minter.address, "20000000000000000000000000");
      await wethContract
        .connect(minter)
        .approve(saleContract.address, "20000000000000000000000000");

      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
      };

      await expect(
        saleContract.buyKeyPostSale("3", signature, overrides)
      ).to.be.revertedWith("Hash Already Used");
    });
  });

  describe("sellKeyForScroll", () => {
    it("Start key to scroll swap timestamp is zero", async () => {
      expect(
        (await saleContract.startKeyToScrollSwapTimestamp()).toString()
      ).to.equal("0");
    });

    it(`SHOULD revert with "ERC721: owner query for nonexistent token", WHEN the sale timeframe is over AND attempts to burn a key that caller doesn't own`, async () => {
      // arrange

      saleContract = saleContract.connect(owner);

      const overrides = {
        from: owner.address,
      };

      wethContract.mint(minter.address, "200000000000000000000");
      wethContract.approve(saleContract.address, "200000000000000000000");
      const hash = ethers.utils.solidityKeccak256(
        ["address", "string"],
        [owner.address, "4"]
      );
      const signature = await owner.signMessage(ethers.utils.arrayify(hash));
      // act
      await saleContract.buyKeyPostSale("4", signature, {
        ...overrides,
      });
      // assert
      await expect(
        saleContract.sellKeyForScroll(5, overrides)
      ).to.be.revertedWith("ERC721: owner query for nonexistent token");
    });
  });

  // describe("setStartKeyToScrollSwapTimestamp", () => {
  //   it(`SHOULD NOT revert, WHEN the owner makes the call`, async () => {
  //     // arrange
  //     saleContract = saleContract.connect(owner);

  //     const currentTimestamp = (
  //       await ethers
  //         .getDefaultProvider()
  //         .getBlock(await ethers.getDefaultProvider().getBlockNumber())
  //     ).timestamp;

  //     // act & assert
  //     await expect(
  //       saleContract.setStartKeyToScrollSwapTimestamp(
  //         currentTimestamp + 1000000000
  //       )
  //     ).to.emit(saleContract, "NewStartKeyToScrollSwapTimestamp").and.to.be.not
  //       .reverted;
  //   });

  //   it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
  //     // arrange
  //     saleContract = saleContract.connect(advisor);

  //     // act & assert
  //     await expect(
  //       saleContract.setStartKeyToScrollSwapTimestamp(startSaleBlockTimestamp)
  //     ).to.be.revertedWith("Ownable: caller is not the owner");
  //   });
  // });

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
