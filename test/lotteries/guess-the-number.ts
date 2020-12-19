import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";

let accounts: Signer[];
let eoa: Signer;
let contract: Contract; // challenge contract

before(async () => {
  accounts = await ethers.getSigners();
  eoa = accounts[0];
  const factory = await ethers.getContractFactory("GuessTheNumberChallenge");
  contract = factory.attach(`0xbF174B38891Bce42E75581f2c55dDD46a1831eDB`);
});

it("solves the challenge", async function () {
  const tx = await contract.guess(42, {
    value: ethers.utils.parseEther(`1`),
    gasLimit: 1e5,
  });
  const txHash = tx && tx.hash;
  expect(txHash).to.not.be.undefined;
  console.log(formatEtherscanTx(txHash));
});
