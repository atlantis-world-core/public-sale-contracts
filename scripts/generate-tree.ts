import { ethers } from "ethers";
import { exportJson, generateArray, unqiueArray } from "../helpers";

async function main() {
  const ADVISORY_LIMIT = 512; // 299
  const PUBLIC_KEY_LIMIT = 16_384; // 9_700

  const advisoryLeaves = generateArray(ADVISORY_LIMIT).map(
    (leaf) => ethers.Wallet.createRandom().address
  );
  const alphaSaleLeaves = generateArray(PUBLIC_KEY_LIMIT).map(
    (leaf) => ethers.Wallet.createRandom().address
  );

  console.log(
    "unqiueArray(advisoryLeaves).length",
    unqiueArray(advisoryLeaves).length
  );
  console.log(
    "unqiueArray(alphaSaleLeaves).length",
    unqiueArray(alphaSaleLeaves).length
  );

  await exportJson("512-advisory-placeholder.json", advisoryLeaves);
  await exportJson("16384-advisory-placeholder.json", alphaSaleLeaves);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
