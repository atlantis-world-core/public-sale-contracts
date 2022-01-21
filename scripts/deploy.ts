import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import readline from "readline";
import { useMerkleHelper } from "../helpers/merkle";
import {
  JAN_22_END_SALE_TIMESTAMP,
  JAN_22_START_SALE_TIMESTAMP,
} from "../utils";
import ADVISORY_WHITELIST from "../helpers/advisory-whitelist.json";
import ALPHA_SALE_WHITELIST from "../helpers/alpha-sale-whitelist.json";

dotenv.config();

function generateMerkleRoots() {
  const merkleHelper = useMerkleHelper();

  // checks if both arrays are empty, throw exception to stop smart contract deployment
  if (ALPHA_SALE_WHITELIST.length === 0 || ADVISORY_WHITELIST.length === 0) {
    console.error(
      "EMPTY_LEAVES: Either the whitelist leaves or the advisory leaves is empty."
    );
    process.exit(1);
  }

  // merkle trees
  const whitelistMerkleTree =
    merkleHelper.createMerkleTree(ALPHA_SALE_WHITELIST);
  const advisorMerkleTree = merkleHelper.createMerkleTree(ADVISORY_WHITELIST);

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  console.log(
    "Merkle root generated for Alpha Sale whitelist\n",
    whitelistMerkleRoot
  );
  console.log(
    "Merkle root generated for advisory whitelist\n\n",
    advisorMerkleRoot
  );

  return {
    whitelistMerkleRoot,
    advisorMerkleRoot,
  };
}

const isNetworkPolygonMainnet =
  hre.network.name === "polygon" || hre.network.config.chainId === 137;
// Just toggle this to `false` Polygon Testnet Mumbai
const polygonMainnetReady = false || isNetworkPolygonMainnet;
const networkName =
  polygonMainnetReady || isNetworkPolygonMainnet ? "Mainnet" : "Mumbai Testnet";

async function main() {
  console.log(`✨ Polygon ${networkName} deployment initializing...\n\n\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!process.env.OWNER) {
    console.error("MISSING_ENV_VALUE: No OWNER found in `.env` file");
    process.exit(1);
  }

  const { advisorMerkleRoot, whitelistMerkleRoot } = generateMerkleRoots();
  const [deployer] = await ethers.getSigners();

  let WETH_ADDRESS = process.env.WETH; // https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619

  if (!WETH_ADDRESS) {
    const wethContract = await ethers.getContractFactory("MockWETH");
    const wethContractDeploy = await wethContract.deploy();
    WETH_ADDRESS = wethContractDeploy.address;
    wethContractDeploy
      .connect(deployer)
      .mint(deployer.address, "200000000000000000000000000000");
  }
  console.log("Deploying Sale Contract 📜...\n");

  const {
    name,
    config: { chainId },
  } = hre.network;
  console.log(`🔌 Connected to "${name}" ChainID: ${chainId}`);

  console.log("Deploying using", deployer.toJSON());
  const deployerBalance =
    parseInt((await deployer.getBalance()).toString()) / 1e18;
  console.log(`Deployer Balance: "${deployerBalance.toFixed(2)}"`);

  const currentTimestamp = (
    await ethers
      .getDefaultProvider()
      .getBlock(await ethers.getDefaultProvider().getBlockNumber())
  ).timestamp;

  const START_SALE_TIMESTAMP = polygonMainnetReady
    ? JAN_22_START_SALE_TIMESTAMP
    : currentTimestamp + 100000;
  const END_SALE_TIMESTAMP = polygonMainnetReady
    ? JAN_22_END_SALE_TIMESTAMP
    : currentTimestamp + 100000 + 5184000;

  const startSaleTimestampDateFormat = new Date(START_SALE_TIMESTAMP * 1000);
  const endSaleTimestampDateFormat = new Date(END_SALE_TIMESTAMP * 1000);

  // verify deployer address
  const question1 = () => {
    return new Promise<boolean>((resolve, reject) => {
      rl.question(
        `\n\nThe deployer is "${deployer.address}", do you want to proceed?: (y/n) `,
        (answer) => {
          if (answer.toLowerCase() === "y") {
            return resolve(true);
          }

          return resolve(false);
        }
      );
    });
  };

  // verify deployer's balance
  const question2 = () => {
    return new Promise<boolean>((resolve, reject) => {
      rl.question(
        `\n\nThe deployer's balance is "${deployerBalance}", do you want to proceed?: (y/n) `,
        (answer) => {
          if (answer.toLowerCase() === "y") {
            return resolve(true);
          }

          return resolve(false);
        }
      );
    });
  };

  // verify timestamp
  const question3 = () => {
    return new Promise<boolean>((resolve, reject) => {
      rl.question(
        `\n\nThe starting sale timestamp is "${START_SALE_TIMESTAMP} (${startSaleTimestampDateFormat})" and ending sale timestamp is "${END_SALE_TIMESTAMP} (${endSaleTimestampDateFormat})", do you want to proceed?: (y/n) `,
        (answer) => {
          if (answer.toLowerCase() === "y") {
            return resolve(true);
          }

          return reject(false);
        }
      );
    });
  };

  const response1 = await question1();
  if (!response1) {
    return process.exit(1);
  }

  const response2 = await question2();
  if (!response2) {
    return process.exit(1);
  }

  const response3 = await question3();
  if (!response3) {
    return process.exit(1);
  }

  // Sale contract
  const SaleContract = await ethers.getContractFactory("Sale");
  console.log("SaleContract Argument...", [
    `whitelistMerkleRoot=${whitelistMerkleRoot}`,
    `advisorMerkleRoot=${advisorMerkleRoot}`,
    `START_SALE_TIMESTAMP=${START_SALE_TIMESTAMP}`,
    `END_SALE_TIMESTAMP=${END_SALE_TIMESTAMP}`,
    `process.env.OWNER=${process.env.OWNER}`,
    `WETH_ADDRESS=${WETH_ADDRESS}`,
  ]);
  const saleContract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    START_SALE_TIMESTAMP,
    END_SALE_TIMESTAMP,
    process.env.OWNER,
    WETH_ADDRESS
  );
  console.info(
    `\n[SaleContract] txHash: "${saleContract.deployTransaction.hash}"`
  );
  console.info(`[SaleContract] expected address: "${saleContract.address}"`);
  await saleContract.deployed();
  console.info(
    `[SaleContract] 💡 Sale contract deployed at address "${saleContract.address}"\n`
  );

  // Key contract
  const KeyContract = await ethers.getContractFactory("Keys");
  const keyContract = await KeyContract.deploy(saleContract.address);
  console.info(
    `\n[KeyContract] txHash: "${keyContract.deployTransaction.hash}"`
  );
  console.info(`[KeyContract] expected address: "${keyContract.address}"`);
  await keyContract.deployed();
  console.info(
    `[KeyContract] 💡 Key contract deployed at address "${keyContract.address}"\n`
  );

  // Scroll proxy contract
  const ScrollProxyContract = await ethers.getContractFactory("ScrollContract");
  const scrollContractImplementation = await ScrollProxyContract.deploy();
  const scrollContract = await upgrades.deployProxy(
    ScrollProxyContract,
    [saleContract.address],
    { initializer: "initialize" }
  );
  // const scrollContract = await ScrollProxyContract.deploy(saleContract.address);
  // await scrollContract.deployed();
  await saleContract.setScrollAddress(scrollContract.address);
  console.info(
    `\n[ScrollProxyContract] txHash: "${scrollContract.deployTransaction.hash}"`
  );
  console.info(
    `[ScrollProxyContract] expected address: "${scrollContract.address}"`
  );
  console.info(
    `[ScrollProxyContract] 💡 Scroll proxy contract deployed at address "${scrollContract.address}", scroll contract imlpementation address "${scrollContractImplementation.address}"\n`
  );

  const [saleContractOwner, keyContractOwner, scrollContractOwner] =
    await Promise.all([
      saleContract.owner(),
      keyContract.owner(),
      scrollContract.owner(),
    ]);

  console.log(`\n\n\n✅ The smart contracts have been deployed successfully!`, {
    saleContractOwner,
    keyContractOwner,
    scrollContractOwner,
  });

  const network = polygonMainnetReady ? "polygon" : "mumbai";
  console.log("\n\n\nVerify the smart contracts with the suggested commands:", [
    `npx hardhat verify --network ${network} ${saleContract.address} ${whitelistMerkleRoot} ${advisorMerkleRoot} ${START_SALE_TIMESTAMP} ${END_SALE_TIMESTAMP} ${process.env.OWNER} ${WETH_ADDRESS}`,
    `npx hardhat verify --network ${network} ${keyContract.address} ${saleContract.address}`,
    `npx hardhat verify --network ${network} ${scrollContractImplementation.address}`,
  ]);

  return process.exit(0);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
