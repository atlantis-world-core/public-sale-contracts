import hre, { ethers, upgrades } from "hardhat";
import * as dotenv from "dotenv";
import { useMerkleHelper } from "../helpers/merkle";
import { toUnixTimestamp } from "../helpers/time";

dotenv.config();

async function main() {
  if (
    !process.env.START_SALE_BLOCK_TIMESTAMP ||
    !process.env.STOP_SALE_BLOCK_TIMESTAMP
  ) {
    console.error(
      "MISSING_ENV_VALUE: The START_SALE_BLOCK_TIMESTAMP and STOP_SALE_BLOCK_TIMESTAMP is not specified"
    );
    process.exit(1);
  }

  if (!process.env.OWNER) {
    console.error("MISSING_ENV_VALUE: No OWNER found in `.env` file");
    process.exit(1);
  }

  const { advisorMerkleRoot, whitelistMerkleRoot } = generateMerkleRoots();

  console.log("\n\n\nDeploying Sale Contract 📜...\n");

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

  // Sale contract
  const SaleContract = await ethers.getContractFactory("Sale");
  const saleContract = await SaleContract.deploy(
    whitelistMerkleRoot,
    advisorMerkleRoot,
    toUnixTimestamp(process.env.START_SALE_BLOCK_TIMESTAMP), // returns a BigNumber -> block.timestamp value
    toUnixTimestamp(process.env.STOP_SALE_BLOCK_TIMESTAMP), // returns a BigNumber -> block.timestamp value
    process.env.OWNER
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
