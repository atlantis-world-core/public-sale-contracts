import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import { useMerkleHelper } from "./helpers/merkle";
import { getAddress } from "ethers/lib/utils";

import ADVISORY_MERKLE from "./helpers/advisory-whitelist-output.json";
import ALPHA_SALE_MERKLE from "./helpers/alpha-sale-whitelist-output.json";

import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { generateMerkleRoots } from "./helpers/generate";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task(
  "generate:root",
  "Generate merkle roots for alpha sale whitelist and advisory whitelist",
  async (args, hre) => {
    const { advisorMerkleRoot, whitelistMerkleRoot } =
      await generateMerkleRoots();

    console.log("\n\n\n");

    console.log("✨ advisorMerkleRoot", advisorMerkleRoot);
    console.log("✨ whitelistMerkleRoot", whitelistMerkleRoot);
  }
);

task("generate:proof", "Generate a merkle proof for a leaf with a merkle root")
  .addParam("address", "The leaf node")
  .setAction(async ({ address }, hre) => {
    const merkle = useMerkleHelper();

    const advisoryTree = merkle.createMerkleTree(
      ADVISORY_MERKLE.leaves.map((leaf) => getAddress(leaf)).sort()
    );
    const advisoryRoot = merkle.createMerkleRoot(advisoryTree);
    const advisoryProof = merkle.createMerkleProof(advisoryTree, address);

    const alphaSaleTree = merkle.createMerkleTree(
      ALPHA_SALE_MERKLE.leaves.map((leaf) => getAddress(leaf)).sort()
    );
    const alphaSaleRoot = merkle.createMerkleRoot(alphaSaleTree);
    const alphaSaleProof = merkle.createMerkleProof(alphaSaleTree, address);

    console.log("✨ advisoryRoot", advisoryRoot);
    console.log("✨ alphaSaleRoot", alphaSaleRoot);
    console.log("✨ advisoryProof", advisoryProof, advisoryProof.toString());
    console.log("✨ alphaSaleProof", alphaSaleProof, alphaSaleProof.toString());
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  networks: {
    localhost: {
      gas: 2100000,
      gasPrice: 8000000000,
      url: "HTTP://127.0.0.1:9545",
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.MATIC_MUMBAI_URL || "",
      chainId: 80001,
      gas: 2100000,
      gasPrice: 8000000000,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_MAINNET_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
