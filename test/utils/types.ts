import { MockContract } from "ethereum-waffle";
import { BigNumber, Contract } from "ethers";
import { Keys, Sale } from "../../typechain";

export type DeployContractsFunctionResult = {
  saleContract: Sale;
  keysContract: Keys;
  scrollContract: Contract;
  mockSaleContract: MockContract;
};

export type DeployContractsFunction = (
  startSaleBlockTimestamp?: BigNumber,
  stopSaleBlockTimestamp?: BigNumber
) => Promise<DeployContractsFunctionResult>;

export type TestSetupArgs = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};
