import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import readline from "readline";
import {
  JAN_22_END_SALE_TIMESTAMP,
  JAN_22_START_SALE_TIMESTAMP,
} from "../utils";

dotenv.config();

const isNetworkPolygonMainnet =
  hre.network.name === "polygon" || hre.network.config.chainId === 137;

// Just toggle this to `false` Polygon Testnet Mumbai
const polygonMainnetReady = false || isNetworkPolygonMainnet;
const networkName =
  polygonMainnetReady || isNetworkPolygonMainnet ? "Mainnet" : "Mumbai Testnet";

// WETH address
const WETH_ADDRESS = polygonMainnetReady
  ? "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619" // https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619
  : "0xfe4f5145f6e09952a5ba9e956ed0c25e3fa4c7f1"; // https://mumbai.polygonscan.com/token/0xfe4f5145f6e09952a5ba9e956ed0c25e3fa4c7f1

const MAGICAL_KEY_CID =
  "bafybeieqybu57sr3alxl6n7rrge3yfwzqwv4pghmirm35aedclt7poav7y";
const FOUNDING_ATLANTEAN_SCROLL_CID =
  "bafybeievwhkikv5xny6u7fvonbmhzrh6rpqystkcd4bfwgvbh7cbesxawy";

const START_SALE_TIMESTAMP = polygonMainnetReady
  ? JAN_22_START_SALE_TIMESTAMP
  : 1642779954;

const END_SALE_TIMESTAMP = polygonMainnetReady
  ? JAN_22_END_SALE_TIMESTAMP
  : 1642787154;

const ADVISORY_WHITELIST_MERKLE_ROOT =
  "0xd446bbf399b8a0f6fa4a4ca69e33eca42e860070f9182eb21a1366841bd8962d";

const ALPHA_SALE_WHITELIST_MERKLE_ROOT =
  "0xc1174e5b307f4ebdf119b4ea78b4bcd8745d7bfa2b175bb5ee261e570a4b796e";

async function main() {
  console.log(`✨ Polygon ${networkName} deployment initializing...\n\n\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!process.env.PUBLIC_VERIFICATION_ADDRESS) {
    console.error(
      "MISSING_ENV_VALUE: No PUBLIC_VERIFICATION_ADDRESS found in `.env` file"
    );
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();

  // let WETH_ADDRESS = process.env.WETH; // https://polygonscan.com/token/0x7ceb23fd6bc0add59e62ac25578270cff1b9f619

  // if (!WETH_ADDRESS) {
  //   const wethContract = await ethers.getContractFactory("MockWETH");
  //   const wethContractDeploy = await wethContract.deploy();
  //   WETH_ADDRESS = wethContractDeploy.address;
  //   wethContractDeploy
  //     .connect(deployer)
  //     .mint(deployer.address, "200000000000000000000000000000");
  // }
  console.log("Deploying contracts 📜...\n");

  const {
    name,
    config: { chainId },
  } = hre.network;
  const deployerBalance =
    parseInt((await deployer.getBalance()).toString()) / 1e18;

  console.log(`\n🔌 Connected to "${name}" network (${chainId})`);
  console.log("Deploying as", deployer.toJSON());
  console.log("Deployer balance", deployerBalance.toFixed(2));

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

  const publicVerificationAddress =
    process.env.PUBLIC_VERIFICATION_ADDRESS || deployer.address;

  console.log("\nSaleContract constructor arguments...", [
    `_whitelistMerkleRoot: ${ALPHA_SALE_WHITELIST_MERKLE_ROOT}`,
    `_advisorMerkleRoot: ${ADVISORY_WHITELIST_MERKLE_ROOT}`,
    `_startSaleBlockTimestamp: ${START_SALE_TIMESTAMP}`,
    `_stopSaleBlockTimestamp: ${END_SALE_TIMESTAMP}`,
    `_publicVerification: ${publicVerificationAddress}`,
    `_WETH: ${WETH_ADDRESS}`,
  ]);

  // Sale contract
  const SaleContract = await ethers.getContractFactory("Sale");
  const saleContract = await SaleContract.deploy(
    ALPHA_SALE_WHITELIST_MERKLE_ROOT,
    ADVISORY_WHITELIST_MERKLE_ROOT,
    START_SALE_TIMESTAMP,
    END_SALE_TIMESTAMP,
    publicVerificationAddress,
    WETH_ADDRESS
  );
  console.info(
    `\n[SaleContract] transaction hash`,
    saleContract.deployTransaction.hash
  );
  console.info(`[SaleContract] expected address`, saleContract.address);
  await saleContract.deployed();
  console.info(
    `[SaleContract] 💡 Sale contract deployed at address`,
    saleContract.address
  );

  // Key contract
  const KeyContract = await ethers.getContractFactory("Keys");
  const keyContract = await KeyContract.deploy(saleContract.address);
  console.info(
    `\n[KeyContract] transaction hash`,
    keyContract.deployTransaction.hash
  );
  console.info(`[KeyContract] expected address`, keyContract.address);
  await keyContract.deployed();
  console.info(
    `[KeyContract] 💡 Key contract deployed at address`,
    keyContract.address
  );
  await saleContract.setKeysAddress(keyContract.address);
  await keyContract.setMagicalKeyTokenURI(MAGICAL_KEY_CID);

  // Scroll proxy contract
  const ScrollProxyContract = await ethers.getContractFactory("ScrollContract");
  const scrollContractImplementation = await ScrollProxyContract.deploy();
  const scrollContract = await upgrades.deployProxy(
    ScrollProxyContract,
    [saleContract.address],
    { initializer: "initialize" }
  );
  console.info(
    `\n[ScrollProxyContract] transaction hash`,
    scrollContract.deployTransaction.hash
  );
  console.info(
    `[ScrollProxyContract] 💡 Scroll proxy contract deployed at address`,
    scrollContract.address
  );
  console.info(
    `[ScrollContract] 💡 Scroll contract imlpementation deployed at address`,
    scrollContractImplementation.address
  );
  await saleContract.setScrollAddress(scrollContract.address);

  const [saleContractOwner, keyContractOwner, scrollContractOwner] =
    await Promise.all([
      saleContract.owner(),
      keyContract.owner(),
      scrollContract.owner(),
    ]);

  console.log(`\n\n\n✅ The smart contracts have been deployed successfully!`, {
    SaleContract: {
      address: saleContract.address,
      owner: saleContractOwner,
    },
    KeyContract: {
      address: keyContract.address,
      owner: keyContractOwner,
    },
    ScrollContract: {
      proxyAddress: scrollContract.address,
      implementationAddress: scrollContractImplementation.address,
      owner: scrollContractOwner,
    },
  });

  const network = polygonMainnetReady ? "polygon" : "mumbai";
  const commands = [
    `npx hardhat verify --network ${network} ${saleContract.address} ${ALPHA_SALE_WHITELIST_MERKLE_ROOT} ${ADVISORY_WHITELIST_MERKLE_ROOT} ${START_SALE_TIMESTAMP} ${END_SALE_TIMESTAMP} ${deployer.address} ${WETH_ADDRESS}`,
    `npx hardhat verify --network ${network} ${keyContract.address} ${saleContract.address}`,
    `npx hardhat verify --network ${network} ${scrollContractImplementation.address}`,
  ];
  console.log(
    "\n\n\nVerify the smart contracts with the suggested commands:",
    commands,
    commands.join(" && ")
  );

  return process.exit(0);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
