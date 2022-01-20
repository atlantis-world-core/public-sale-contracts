import { ethers } from "hardhat";

// Mock Solidity block.timestamp
// https://ethereum.stackexchange.com/questions/15596/how-can-i-mock-the-time-for-solidity-tests
// https://www.unixtimestamp.com/index.php
export const BLOCK_ONE_SECOND = 1000;
export const BLOCK_ONE_MINUTE = 60000;
export const BLOCK_ONE_HOUR = 3600000;
export const BLOCK_ONE_DAY = 86400000;
export const BLOCK_ONE_WEEK = 604800000;
export const BLOCK_ONE_MONTH = 2678400000;
export const BLOCK_ONE_YEAR = 31536000000;

export const JAN_22_START_SALE_TIMESTAMP =
  new Date(Date.UTC(2022, 0, 22, 20, 22)).getTime() / 1000;
export const JAN_22_END_SALE_TIMESTAMP = JAN_22_START_SALE_TIMESTAMP + 86400;

export async function getCurrentBlockTimestamp(): Promise<number> {
  const blockNumber = await ethers.provider.getBlockNumber();
  const [block] = await Promise.all([ethers.provider.getBlock(blockNumber)]);
  const now = blockTimestampToBigNumber(block.timestamp);
  return now;
}

export function blockTimestampToBigNumber(timestamp: number): number {
  return Math.floor(timestamp * 1000);
}

export function bigNumberToBlockTimestamp(timestmap: number): number {
  return Math.floor(timestmap / 1000);
}
