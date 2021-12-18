import { deployMockContract } from "ethereum-waffle";
import { ethers, upgrades } from "hardhat";
import { useMerkleHelper } from "../../helpers/merkle";
import { BigNumber } from "ethers";
import { Sale } from "../../typechain";
import { fromUnixTimestamp } from "../../helpers/time";
import {
  DeployContractsFunction,
  DeployContractsFunctionResult,
} from "./types";
import {
  ADVISOR_WHITELISTED_USERS,
  WHITELISTED_USERS,
} from "../../helpers/whitelist";

import SaleABI from "../../artifacts/contracts/Sale.sol/Sale.json";

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
    const SaleContract = await ethers.getContractFactory("Sale", {
      signer: owner,
    });
    const saleContract = await SaleContract.deploy(
      whitelistMerkleRoot,
      advisorMerkleRoot,
      startSaleBlockTimestamp ?? BigNumber.from(0),
      stopSaleBlockTimestamp ?? BigNumber.from(0)
    );
    const mockSaleContract = await deployMockContract(owner, SaleABI.abi);
    await saleContract.deployed();

    // Keys contract deploy
    const KeysContract = await ethers.getContractFactory("Keys");
    const keysContract = await KeysContract.deploy(saleContract.address);
    await keysContract.deployed();
    await saleContract.setKeysAddress(keysContract.address);

    // ScrollContract deploy
    const ScrollContract = await ethers.getContractFactory("ScrollContract");
    const scrollContract = await upgrades.deployProxy(
      ScrollContract,
      [saleContract.address],
      { initializer: "initialize" }
    );
    await saleContract.setScollAddress(scrollContract.address);

    return {
      saleContract,
      keysContract,
      scrollContract,
      mockSaleContract,
    };
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

  return {
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
