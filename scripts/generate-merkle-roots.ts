import { generateMerkleRoots } from "../helpers";

async function main() {
  await generateMerkleRoots();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
