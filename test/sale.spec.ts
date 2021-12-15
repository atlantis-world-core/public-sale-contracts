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

  const setup = async (args?: SetupArgs) => {
    // signers
    const signers = await ethers.getSigners();
    whitelistSigners = signers.splice(0, 8);
    advisorSigners = signers.splice(8, 8);
    const [_owner, _minter] = whitelistSigners;
    const [_advisor] = advisorSigners;

    owner = _owner;
    minter = _minter;
    advisor = _advisor;

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

  describe("mintPrice", () => {
    // a very basic test, just so we can easily confirm the test setup is working as expected
    it("SHOULD return 0.2 ether, WHEN called", async () => {
      const mintPrice = await saleContract.mintPrice();

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

    it(`SHOULD revert with "You weren't whitelisted", WHEN GIVEN an invalid merkle proof AND the sale is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(minter);
      const badMerkleProof: string[] = [];
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(
        saleContract.buyKeyFromSale(badMerkleProof, overrides)
      ).to.be.revertedWith("You weren't whitelisted");
    });

    it(`SHOULD revert with "Sale is over", WHEN GIVEN a valid merkle proof AND the sale time range is from the past`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2019-12-01"),
        toUnixTimestamp("2020-01-31")
      );
      saleContract = saleContract.connect(minter);
      const proof = validWhitelistProof();
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };
      // await logTimestamps(saleContract, "should revert test");

      // act & assert
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
          value: validMintPayment,
        })
      ).to.emit(saleContract, "KeyPurchasedOnSale").and.to.be.not.reverted;
    });
  });

  describe("buyKeyPostSale", () => {
    it(`SHOULD revert with "Insufficient payment", WHEN the sale timeframe is still over AND mint payment is NOT 0.2 ether`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: invalidMintPayment,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.reverted;
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.revertedWith(
        "Insufficient payment"
      );
    });

    it(`SHOULD revert with "Sale is ongoing", WHEN the sale timeframe is still on-going`, async () => {
      // arrange
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.reverted;
      await expect(saleContract.buyKeyPostSale(overrides)).to.be.revertedWith(
        "Sale is ongoing"
      );
    });

    it(`SHOULD NOT revert with "Sale is ongoing", WHEN the sale timeframe is over`, async () => {
      // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
      saleContract = saleContract.connect(minter);
      const overrides = {
        from: minter.address,
        value: validMintPayment,
      };

      // act & assert
      await expect(saleContract.buyKeyPostSale(overrides)).not.to.be.reverted;
      await expect(
        saleContract.buyKeyPostSale(overrides)
      ).not.to.be.revertedWith("Sale is ongoing");
    });
  });

  describe("sellKeyForScroll", () => {
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
          value: validMintPayment,
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
      // // arrange
      let saleContract = await deploySaleContract(
        toUnixTimestamp("2020-12-01"),
        toUnixTimestamp("2021-01-31")
      );
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
      await expect(saleContract.setScollAddress(saleContract.address)).to.be.not
        .reverted;
    });

    it(`SHOULD revert with "Ownable: caller is not the owner", WHEN it's NOT the owner that makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(advisor);

      // act & assert
      await expect(
        saleContract.setScollAddress(saleContract.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it(`SHOULD revert with "Must not be an empty address", WHEN GIVEN address(0) AND the owner makes the call`, async () => {
      // arrange
      saleContract = saleContract.connect(owner);

      // act & assert
      await expect(
        saleContract.setScollAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Must not be an empty address");
    });
  });
});
