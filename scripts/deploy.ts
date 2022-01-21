import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import readline from "readline";
import {
  BLOCK_ONE_HOUR,
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
  : 1642757105;

const END_SALE_TIMESTAMP = polygonMainnetReady
  ? JAN_22_END_SALE_TIMESTAMP
  : 1642758305;

const ADVISORY_WHITELIST_MERKLE_ROOT =
  "0x3d5becc2a6bf1326a88d5be55b68d41b6a036c4c02b656866c763129ac5b6639";

const ALPHA_SALE_WHITELIST_MERKLE_ROOT =
  "0x28204831c19eca66608b3167f6bc35872730b74e14d21feab8833883b522ac34";

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
  console.log("SaleContract constructor arguments...", [
    `_whitelistMerkleRoot: ${ALPHA_SALE_WHITELIST_MERKLE_ROOT}`,
    `_advisorMerkleRoot: ${ADVISORY_WHITELIST_MERKLE_ROOT}`,
    `_startSaleBlockTimestamp: ${START_SALE_TIMESTAMP}`,
    `_stopSaleBlockTimestamp: ${END_SALE_TIMESTAMP}`,
    `_publicVerification: ${process.env.OWNER}`,
    `_WETH: ${WETH_ADDRESS}`,
  ]);
  const saleContract = await SaleContract.deploy(
    ALPHA_SALE_WHITELIST_MERKLE_ROOT,
    ADVISORY_WHITELIST_MERKLE_ROOT,
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
  await saleContract.setKeysAddress(keyContract.address);
  keyContract.setMagicalKeyTokenURI(MAGICAL_KEY_CID);
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
  const commands = [
    `npx hardhat verify --network ${network} ${saleContract.address} ${ALPHA_SALE_WHITELIST_MERKLE_ROOT} ${ADVISORY_WHITELIST_MERKLE_ROOT} ${START_SALE_TIMESTAMP} ${END_SALE_TIMESTAMP} ${process.env.OWNER} ${WETH_ADDRESS}`,
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
