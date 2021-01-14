// https://capturetheether.com/challenges/warmup/call-me/
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";

let accounts: Signer[];
let eoa: Signer;
let contract: Contract; // challenge contract

before(async () => {
  accounts = await ethers.getSigners();
  eoa = accounts[0];
  // contract = new ethers.Contract(
  //   `0x7e53cBe1AE1D8BCc1e4273ED31eb61bC4513C509`,
  //   ``,
  //   accounts[0]
  // );
  const factory =  await ethers.getContractFactory("CallMeChallenge")
  contract = factory.attach(`0x7e53cBe1AE1D8BCc1e4273ED31eb61bC4513C509`)
});

it("solves the challenge", async function () {
  const tx = await contract.callme();
  const txHash = tx.hash
  expect(txHash).to.not.be.undefined
});
