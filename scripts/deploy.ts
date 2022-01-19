import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import readline from "readline";
import { useMerkleHelper } from "../helpers/merkle";
import {
  JAN_22_END_SALE_TIMESTAMP,
  JAN_22_START_SALE_TIMESTAMP,
} from "../utils";

dotenv.config();

// Just toggle this to `true` when it's finally ready for Polygon Mainnet
const polygonMainnetReady = false;
const network = polygonMainnetReady ? "Mainnet" : "Mumbai Testnet";
const WETH_ADDRESS = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"; // https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619

async function main() {
  console.log(`✨ Polygon ${network} deployment initializing...\n\n\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!process.env.OWNER) {
    console.error("MISSING_ENV_VALUE: No OWNER found in `.env` file");
    process.exit(1);
  }

  const { advisorMerkleRoot, whitelistMerkleRoot } = generateMerkleRoots();

  console.log("Deploying Sale Contract 📜...\n");

  const {
    name,
    config: { chainId },
  } = hre.network;
  console.log(`🔌 Connected to "${name}" ChainID: ${chainId}`);

  const [deployer] = await ethers.getSigners();
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
        `The deployer is "${deployer.address}", do you want to proceed?: (y/n) `,
        (answer) => {
          if (answer.toLowerCase() === "y") {
            return resolve(true);
          }

          return reject(false);
        }
      );
    });
  };

  // verify deployer's balance
  const question2 = () => {
    return new Promise<boolean>((resolve, reject) => {
      rl.question(
        `The deployer's balance is "${deployerBalance}", do you want to proceed?: (y/n) `,
        (answer) => {
          if (answer.toLowerCase() === "y") {
            return resolve(true);
          }

          return reject(false);
        }
      );
    });
  };

  // verify timestamp
  const question3 = () => {
    return new Promise<boolean>((resolve, reject) => {
      rl.question(
        `The starting sale timestamp is "${START_SALE_TIMESTAMP} (${startSaleTimestampDateFormat})" and ending sale timestamp is "${END_SALE_TIMESTAMP} (${endSaleTimestampDateFormat})", do you want to proceed?: (y/n) `,
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
  console.log(
    "SaleContract Argument...",
    whitelistMerkleRoot,
    advisorMerkleRoot,
    START_SALE_TIMESTAMP,
    END_SALE_TIMESTAMP,
    process.env.OWNER,
    WETH_ADDRESS
  );
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
    `[ScrollProxyContract] 💡 Scroll proxy contract deployed at address "${scrollContract.address}"\n`
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
}

function generateMerkleRoots() {
  const merkleHelper = useMerkleHelper();

  // TODO: To be replaced with a JSON file reference
  const WHITELISTED_USERS = (process.env.WHITELISTED_USERS ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter((leaf) => leaf);

  // TODO: To be replaced with a JSON file reference
  const ADVISOR_WHITELISTED_USERS = (
    process.env.ADVISOR_WHITELISTED_USERS ?? ""
  )
    .split(",")
    .map((key) => key.trim())
    .filter((leaf) => leaf);

  // checks if both arrays are empty, throw exception to stop smart contract deployment
  if (
    WHITELISTED_USERS.length === 0 ||
    ADVISOR_WHITELISTED_USERS.length === 0
  ) {
    console.error(
      "EMPTY_LEAVES: Either the whitelist leaves or the advisory leaves is empty."
    );
    process.exit(1);
  }

  console.log("\n[generateMerkleRoots] WHITELISTED_USERS", WHITELISTED_USERS);
  console.log(
    "[generateMerkleRoots] ADVISOR_WHITELISTED_USERS\n",
    ADVISOR_WHITELISTED_USERS
  );

  // merkle trees
  const whitelistMerkleTree = merkleHelper.createMerkleTree(WHITELISTED_USERS);
  const advisorMerkleTree = merkleHelper.createMerkleTree(
    ADVISOR_WHITELISTED_USERS
  );

  console.log(
    "\n[generateMerkleRoots] whitelistMerkleTree",
    whitelistMerkleTree
  );
  console.log("[generateMerkleRoots] advisorMerkleTree\n", advisorMerkleTree);

  // merkle roots
  const whitelistMerkleRoot =
    merkleHelper.createMerkleRoot(whitelistMerkleTree);
  const advisorMerkleRoot = merkleHelper.createMerkleRoot(advisorMerkleTree);

  console.log(
    "\n[generateMerkleRoots] whitelistMerkleRoot",
    whitelistMerkleRoot
  );
  console.log("[generateMerkleRoots] advisorMerkleRoot\n", advisorMerkleRoot);

  return {
    whitelistMerkleRoot,
    advisorMerkleRoot,
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
