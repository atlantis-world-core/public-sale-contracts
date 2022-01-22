import { MockContract } from "ethereum-waffle";
import { BigNumber, Contract } from "ethers";
import {
  AtlantisWorldAlphaSale,
  AtlantisWorldMagicalKeys,
  MockWETH,
} from "../../typechain";

export type DeployContractsFunctionResult = {
  saleContract: AtlantisWorldAlphaSale;
  keysContract: AtlantisWorldMagicalKeys;
  scrollContract: Contract;
  mockSaleContract: MockContract;
  wethContract: MockWETH;
};

export type DeployContractsFunction = (
  startSaleBlockTimestamp?: BigNumber,
  stopSaleBlockTimestamp?: BigNumber
) => Promise<DeployContractsFunctionResult>;

export type TestSetupArgs = {
  saleStart?: BigNumber;
  saleStop?: BigNumber;
};
