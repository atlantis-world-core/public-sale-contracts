import { BigNumber } from "@ethersproject/bignumber";

export function toUnixTimestamp(date: string): BigNumber {
  return BigNumber.from(new Date(date).getTime() / 1000);
}

export function fromUnixTimestamp(timestamp: BigNumber): Date {
  return new Date(timestamp.toNumber() * 1000);
}
