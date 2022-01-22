import { ethers } from "ethers";

import AtlantisWorldAlphaSaleABI from "../artifacts/contracts/AtlantisWorldAlphaSale.sol/AtlantisWorldAlphaSale.json";
import { AtlantisWorldAlphaSale } from "../typechain";

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mainnet.g.alchemy.com/v2/_b8bCBxIt33YdCczcbrBsN4KYrFjxHFC"
  );
  const signer = new ethers.Wallet("PRIVATE_KEY", provider);

  const contract = (await new ethers.Contract(
    "0xf4d05f08Edd9Fb32Fe830C5DA65D9B1a848247B3",
    AtlantisWorldAlphaSaleABI.abi,
    signer
  )) as AtlantisWorldAlphaSale;

  let tx = await contract.setAdvisorMerkleRoot(
    "0x228db531b0a313857cdfd059c6fc69e20e063b7727451275172ce051d9447f4e"
  );
  await tx.wait();

  tx = await contract.setWhitelistMerkleRoot(
    "0x65ba213ba87e9d7c370c35a9f618bd0a698946bf82e893633077a350e5516f0f"
  );
  await tx.wait();

  tx = await contract.setPublicVerificationAddress(
    "0xFD88bcb92521E8E4eAa3B4037E0c73274859B250"
  );
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
