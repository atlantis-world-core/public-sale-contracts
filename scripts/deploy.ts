import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import { useMerkleHelper } from "../helpers/merkle";
import axios from "axios";

dotenv.config();

function generateMerkleRoots() {
  const merkleHelper = useMerkleHelper();

  const WHITELISTED_USERS = (process.env.WHITELISTED_USERS ?? "")
    .split(",")
    .map((key) => key.trim());
  const ADVISOR_WHITELISTED_USERS = (
    process.env.ADVISOR_WHITELISTED_USERS ?? ""
  )
    .split(",")
    .map((key) => key.trim());

  // checks if both arrays are empty, throw exception to stop smart contract deployment
  if (
    WHITELISTED_USERS.length === 0 ||
    ADVISOR_WHITELISTED_USERS.length === 0
  ) {
    const ERROR_MESSAGE =
      "EMPTY_LEAVES: Either the whitelist leaves or the advisory leaves is empty.";
    console.error(ERROR_MESSAGE);
    throw new Error(ERROR_MESSAGE);
  }

  // merkle trees
  const whitelistMerkleTree = merkleHelper.createMerkleTree(WHITELISTED_USERS);
  const advisorMerkleTree = merkleHelper.createMerkleTree(
    ADVISOR_WHITELISTED_USERS
  );

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  return {
    whitelistMerkleRoot,
    advisorMerkleRoot,
  };
}

async function main() {
  const { advisorMerkleRoot, whitelistMerkleRoot } = generateMerkleRoots();

  console.log("Deploying Sale Contract");

  const {
    name,
    config: { chainId },
  } = hre.network;

  console.log(`Connected to ${name} ChainID: ${chainId}`);

  if (!process.env.owner) {
    console.log("No Owner found in .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying using " + deployer);
  const deployerBalance =
    parseInt((await deployer.getBalance()).toString()) / 1e18;
  console.log("Balance = " + deployerBalance.toFixed(2));

  const ownerAddress = process.env.OWNER
    ? process.env.OWNER
    : await deployer.getAddress();

  if (
    !process.env.startSaleBlockTimestamp ||
    !process.env.stopSaleBlockTimestamp
  ) {
    console.warn("⚠️ The START timestamp and END timestamp is not specified");
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  // Sale contract
  const SaleContract = await ethers.getContractFactory("Sale");
  const saleContract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    process.env.startSaleBlockTimestamp,
    process.env.stopSaleBlockTimestamp
  );
  console.info(
    `[SaleContract] txHash: "${saleContract.deployTransaction.hash}"`
  );
  console.info(`[SaleContract] expected address: "${saleContract.address}"`);
  await saleContract.deployed();
  console.info(
    `[SaleContract] 💡 Sale contract deployed at address "${saleContract.address}"`
  );

  // Key contract
  const KeyContract = await ethers.getContractFactory("Keys");
  const keyContract = await KeyContract.deploy(saleContract.address);
  console.info(`[KeyContract] txHash: "${keyContract.deployTransaction.hash}"`);
  console.info(`[KeyContract] expected address: "${keyContract.address}"`);
  await keyContract.deployed();
  console.info(
    `[KeyContract] 💡 Key contract deployed at address "${saleContract.address}"`
  );

  // Scroll proxy contract
  const ScrollProxyContract = await ethers.getContractFactory("Keys");
  const scrollContract = await upgrades.deployProxy(
    ScrollProxyContract,
    [saleContract.address],
    { initializer: "initialize" }
  );
  await saleContract.setScrollAddress(scrollContract.address);
  console.info(
    `[ScrollProxyContract] txHash: "${scrollContract.deployTransaction.hash}"`
  );
  console.info(
    `[ScrollProxyContract] expected address: "${scrollContract.address}"`
  );
  console.info(
    `[ScrollProxyContract] 💡 Scroll proxy contract deployed at address "${scrollContract.address}"`
  );

  // const scrollContract = await ScrollProxyContract.deploy(saleContract.address);
  // await scrollContract.deployed();

  // await scrollContract.connect(ownerAddress).initialize(saleContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
