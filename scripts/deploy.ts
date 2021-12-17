import hre, { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { utils } from "ethers";
import axios from "axios";

export async function getCurrentGas(apiKey: string) {
  const url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;
  return parseInt((await axios.get(url)).data.result.ProposeGasPrice);
}

async function main() {
  console.log("Deploying Sale Contrac");

  const {
    name,
    config: { chainId },
  } = hre.network;

  console.log(`Connected to ${name} ChainID : ${chainId}`);

  if (!process.env.owner) {
    console.log("No Owner found in .env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying using " + deployer);
  const deployerBalance =
    parseInt((await deployer.getBalance()).toString()) / 1e18;
  console.log("Balance = " + deployerBalance.toFixed(2));

  const SaleContract = await ethers.getContractFactory("Sale");
  const ownerAddress = process.env.OWNER
    ? process.env.OWNER
    : await deployer.getAddress();
  if (
    !process.env.startSaleBlockTimestamp ||
    !process.env.stopSaleBlockTimestamp
  ) {
    console.log("Start and End time not specified");
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  const whiteListMerkleRoot = "";
  const advisoryMerkleRoot = "";

  const sale = await SaleContract.deploy(
    whiteListMerkleRoot,
    advisoryMerkleRoot,
    process.env.startSaleBlockTimestamp,
    process.env.stopSaleBlockTimestamp
  );

  console.log(`txHash: ${sale.deployTransaction.hash}`);
  console.log(`expected address: ${sale.address}`);
  await sale.deployed();

  console.log("Sale Deployed at address " + sale.address);

  const Key = await ethers.getContractFactory("Keys");

  const key = await Key.deploy(sale.address);
  console.log(`txHash: ${key.deployTransaction.hash}`);
  console.log(`expected address: ${key.address}`);
  await key.deployed();

  console.log("Key Deployed at address " + sale.address);

  const Scroll = await ethers.getContractFactory("Keys");

  const scroll = await Scroll.deploy();
  console.log(`txHash: ${scroll.deployTransaction.hash}`);
  console.log(`expected address: ${scroll.address}`);
  await scroll.deployed();

  console.log("Scroll deployed at address " + scroll.address);

  await scroll.connect(ownerAddress).initialize(sale.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
