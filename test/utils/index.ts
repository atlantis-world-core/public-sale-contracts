import { deployMockContract } from "ethereum-waffle";
import { ethers, upgrades } from "hardhat";
import { useMerkleHelper } from "../../helpers/merkle";
import { BigNumber } from "ethers";
import { fromUnixTimestamp } from "../../helpers/time";
import {
  DeployContractsFunction,
  DeployContractsFunctionResult,
} from "./types";
import {
  ADVISOR_WHITELISTED_USERS,
  WHITELISTED_USERS,
} from "../../helpers/whitelist";

import AtlantisWorldAlphaSaleABI from "../../artifacts/contracts/AtlantisWorldAlphaSale.sol/AtlantisWorldAlphaSale.json";
import { AtlantisWorldAlphaSale } from "../../typechain";

export const testSetup = async () => {
  const useEthersJsSigners = true;
  const merkleHelper = useMerkleHelper();

  // signers
  const signers = await ethers.getSigners();
  const whitelistSigners = signers.splice(0, 8);
  const advisorSigners = signers.splice(8, 8);
  const [owner, minter] = whitelistSigners;
  const [advisor] = advisorSigners;

  // leaves
  const whitelistLeaves = useEthersJsSigners
    ? whitelistSigners.map((signer) => signer.address)
    : WHITELISTED_USERS;
  const advisorLeaves = useEthersJsSigners
    ? advisorSigners.map((signer) => signer.address)
    : ADVISOR_WHITELISTED_USERS;

  // merkle trees
  const whitelistMerkleTree = merkleHelper.createMerkleTree(whitelistLeaves);
  const advisorMerkleTree = merkleHelper.createMerkleTree(advisorLeaves);

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  const deployContracts: DeployContractsFunction = async (
    startSaleBlockTimestamp?: BigNumber,
    stopSaleBlockTimestamp?: BigNumber
  ): Promise<DeployContractsFunctionResult> => {
    const SaleContract = await ethers.getContractFactory(
      "AtlantisWorldAlphaSale",
      {
        signer: owner,
      }
    );

    const WETH = await ethers.getContractFactory("MockWETH");
    const wethContract = await WETH.deploy();

    const saleContract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp ?? BigNumber.from(0),
      stopSaleBlockTimestamp ?? BigNumber.from(0),
      owner.address,
      wethContract.address
    );
    const mockSaleContract = await deployMockContract(
      owner,
      AtlantisWorldAlphaSaleABI.abi
    );
    await saleContract.deployed();

    // Keys contract deploy
    const KeysContract = await ethers.getContractFactory(
      "AtlantisWorldMagicalKeys",
      {
        signer: owner,
      }
    );
    const keysContract = await KeysContract.deploy(saleContract.address);
    await keysContract.deployed();
    await saleContract.setKeysAddress(keysContract.address);

    // ScrollContract deploy
    const ScrollContract = await ethers.getContractFactory(
      "AtlantisWorldFoundingAtlanteanScrolls",
      {
        signer: owner,
      }
    );
    const scrollContract = await upgrades.deployProxy(
      ScrollContract,
      [saleContract.address],
      { initializer: "initialize" }
    );
    await saleContract.setScrollAddress(scrollContract.address);

    return {
      saleContract,
      keysContract,
      scrollContract,
      mockSaleContract,
      wethContract,
    };
  };

  /**
   * @description
   * Just logs the timestamps from the smart contract.
   */
  const logTimestamps = async (
    saleContract: AtlantisWorldAlphaSale,
    metadata?: any
  ) => {
    const [_startSaleBlockTimestamp, _stopSaleBlockTimestamp] =
      await Promise.all([
        saleContract.startSaleBlockTimestamp(),
        saleContract.stopSaleBlockTimestamp(),
      ]);
    console.log(
      "[logTimestamps] ??? logging timestamps",
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

  return {
    signers,
    owner,
    minter,
    advisor,
    whitelistLeaves,
    advisorLeaves,
    whitelistMerkleTree,
    advisorMerkleTree,
    whitelistMerkleRoot,
    advisorMerkleRoot,
    deployContracts,
    logTimestamps,
  };
};
