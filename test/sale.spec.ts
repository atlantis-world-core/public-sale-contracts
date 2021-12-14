import { useMerkleHelper } from "../helpers/merkle";
import { fromUnixTimestamp, toUnixTimestamp } from "../helpers/time";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import MerkleTree from "merkletreejs";
import { KeysContract, Sale, ScrollContract } from "../typechain";
import {
  deployMockContract,
  MockContract,
} from "@ethereum-waffle/mock-contract";
import {
  ADVISOR_WHITELISTED_USERS,
  WHITELISTED_USERS,
} from "../helpers/whitelist";

import SaleABI from "../artifacts/contracts/Sale.sol/Sale.json";
import KeysContractABI from "../artifacts/contracts/Keys.sol/KeysContract.json";
import ScrollContractABI from "../artifacts/contracts/Scroll.sol/ScrollContract.json";
import { BigNumber } from "@ethersproject/bignumber";

export type SetupArgs = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};

const useEthersJsSigners = true;

/**
 * @todo
 * The timestamps should not be relative, should be replaced with a
 * library where you can add days, weeks, months, and years. Where
 * it's not going to be relative to the current timestamp when the
 * test is being executed. Otherwise tests would fail at some time.
 */
describe("Sale", () => {
  const merkleHelper = useMerkleHelper();

  // contracts
  let saleContract: Sale;
  let keysContract: KeysContract;
  let scrollContract: ScrollContract;

  // mock contracts
  let mockSaleContract: MockContract;
  let mockKeysContract: MockContract;
  let mockScrollContract: MockContract;

  // sale timestamps
  let startSaleBlockTimestamp: BigNumber = toUnixTimestamp("2021-12-31");
  let stopSaleBlockTimestamp: BigNumber = toUnixTimestamp("2022-01-31");

  // signers
  let whitelistSigners: SignerWithAddress[];
  let advisorSigners: SignerWithAddress[];
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;

  // leaves
  let whitelistLeaves: string[];
  let advisorLeaves: string[];

  // merkle trees
  let whitelistMerkleTree: MerkleTree;
  let advisorMerkleTree: MerkleTree;

  // merkle roots
  let whitelistMerkleRoot: string;
  let advisorMerkleRoot: string;

  // ether
  const validMintPrice = ethers.utils.parseEther("0.2");
  const invalidMintPrice = ethers.utils.parseEther("0.01");

  const setup = async (args?: SetupArgs) => {
    // signers
    const signers = await ethers.getSigners();
    const [_owner, _minter] = signers;
    owner = _owner;
    minter = _minter;
    whitelistSigners = signers.splice(0, 8);
    advisorSigners = signers.splice(8, 8);

    // leaves
    whitelistLeaves = useEthersJsSigners
      ? whitelistSigners.map((signer) => signer.address)
      : WHITELISTED_USERS;
    advisorLeaves = useEthersJsSigners
      ? advisorSigners.map((signer) => signer.address)
      : ADVISOR_WHITELISTED_USERS;

    // merkle trees
    whitelistMerkleTree = merkleHelper.createMerkleTree(whitelistLeaves);
    advisorMerkleTree = merkleHelper.createMerkleTree(advisorLeaves);

    // merkle roots
    whitelistMerkleRoot = merkleHelper.createMerkleRoot(whitelistMerkleTree);
    advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

    // Sale contract deploy
    saleContract = await deploySaleContract(
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp
    );

    // connect as a minter
    saleContract = saleContract.connect(minter);

    // logs
    // console.log("Sale contract address", saleContract.address);
    // console.log("Keys contract address", keysContract.address);
    // console.log("Scroll contract address", scrollContract.address);
  };

  // TODO: Should not deploy Keys and Scroll contract as a normal contract but rather should be a Proxy
  const deploySaleContract = async (
    startSaleBlockTimestamp: BigNumber,
    stopSaleBlockTimestamp: BigNumber
  ) => {
    const SaleContract = await ethers.getContractFactory("Sale", {
      signer: owner,
    });
    const saleContract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp,
      stopSaleBlockTimestamp
    );
    mockSaleContract = await deployMockContract(owner, SaleABI.abi);
    await saleContract.deployed();

    // Keys contract deploy
    // TODO: Should be deployed using proxy
    const KeysContract = await ethers.getContractFactory("KeysContract");
    keysContract = await KeysContract.deploy(saleContract.address);
    mockKeysContract = await deployMockContract(owner, KeysContractABI.abi);
    await keysContract.deployed();
    await saleContract.setKeysAddress(keysContract.address);

    // ScrollContract deploy
    // TODO: Should be deployed using proxy
    const ScrollContract = await ethers.getContractFactory("ScrollContract");
    scrollContract = await ScrollContract.deploy();
    mockScrollContract = await deployMockContract(owner, ScrollContractABI.abi);
    await scrollContract.deployed();
    await saleContract.setScollAddress(scrollContract.address);
    await scrollContract.initialize(saleContract.address);

    return saleContract;
  };

  const validWhitelistProof = (_leaf?: string): string[] => {
    const [, leaf] = whitelistLeaves;
    const hash = ethers.utils.keccak256(_leaf ?? leaf);
    const proof = merkleHelper.createMerkleProof(whitelistMerkleTree, hash);
    return proof;
  };

  /**
   * @description
   * Just logs the timestamps from the smart contract.
   */
  const logTimestamps = async (saleContract: Sale, metadata?: any) => {
    const [_startSaleBlockTimestamp, _stopSaleBlockTimestamp] =
      await Promise.all([
        saleContract.startSaleBlockTimestamp(),
        saleContract.stopSaleBlockTimestamp(),
      ]);
    console.log(
      "[logTimestamps] ⌚ logging timestamps",
      {
        _startSaleBlockTimestamp: fromUnixTimestamp(
          _startSaleBlockTimestamp
        ).toLocaleDateString(),
        _stopSaleBlockTimestamp: fromUnixTimestamp(
          _stopSaleBlockTimestamp
        ).toLocaleDateString(),
      },
      metadata
    );
  };

  beforeEach(async () => await setup());

  describe("property: mintPrice", () => {
    // a very basic test, just so we can easily confirm the test setup is working as expected
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await saleContract.mintPrice();

      // assert
      expect(ethers.utils.formatEther(mintPrice)).to.be.equal("0.2");
    });
  });

  describe("modifier: isSaleOngoing", () => {
    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale timeframe is from the past`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2019-12-01"),
        toUnixTimestamp("2020-01-31")
      );
      saleContract = saleContract.connect(minter);
      const proof = validWhitelistProof();
      const overrides = {
        from: minter.address,
        value: validMintPrice,
      };
      // await logTimestamps(saleContract, "should revert test");

      // act & assert
      await expect(saleContract.buyKeyFromSale(proof, overrides)).to.be
        .reverted;
      await expect(
        saleContract.buyKeyFromSale(proof, overrides)
      ).to.be.revertedWith("Sale is over");
    });

    it(`SHOULD NOT revert, WHEN GIVEN a valid merkle proof AND 0.2 ether transaction value AND the sale is still on-going`, async () => {
      // arrange
      startSaleBlockTimestamp = toUnixTimestamp("2021-12-01");
      stopSaleBlockTimestamp = toUnixTimestamp("2022-01-31");
      await setup();

      // assert
      await expect(
        saleContract.buyKeyFromSale(validWhitelistProof(), {
          from: minter.address,
          value: validMintPrice,
        })
      ).to.emit(saleContract, "KeyPurchasedOnSale").and.to.be.not.reverted;
    });
  });

  describe("modifier: hasSaleEnded", () => {
    it(`SHOULD revert with "Sale is ongoing", WHEN the sale timeframe is still on-going`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2021-12-01"),
        toUnixTimestamp("2022-01-31")
      );
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPrice,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.reverted;
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.revertedWith(
        "Sale is ongoing"
      );
    });

    it(`SHOULD NOT revert with "Sale is ongoing", WHEN the sale timeframe is still over`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPrice,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(overrides)).not.to.be.reverted;
      await expect(
        saleContract.buyKeyPostSale(overrides)
      ).not.to.be.revertedWith("Sale is ongoing");
    });
  });

  describe("modifier: canKeySwapped", () => {
    it(`SHOULD revert with "A date for swapping hasn't been set", WHEN the startKeyToScrollSwapTimestamp is not set`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(owner);
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale({
          ...overrides,
          value: validMintPrice,
        }),
      ]);

      // assert
      await expect(
        saleContract.sellKeyForScroll(1, overrides)
      ).to.be.revertedWith("A date for swapping hasn't been set");
    });

    it(`SHOULD revert with "Please wait for the swapping to begin", WHEN the startKeyToScrollSwapTimestamp is not set`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2023-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale({
          ...overrides,
          value: validMintPrice,
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
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2020-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale({
          ...overrides,
          value: validMintPrice,
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
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(owner);
      const keySwappingTimestamp = toUnixTimestamp("2020-12-05");
      const overrides = {
        from: owner.address,
      };

      // act
      await Promise.all([
        saleContract.buyKeyPostSale({
          ...overrides,
          value: validMintPrice,
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

  describe("function: preMint", () => {
    /** @todo */
  });

  describe("function: buyKeyFromSale", () => {
    /** @todo */
  });

  describe("function: buyKeyPostSale", () => {
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
