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
  const factory = await ethers.getContractFactory(
    "GuessTheSecretNumberChallenge"
  );
  contract = factory.attach(`0x92e077E6df89B7019954a5a583D76C642a37739D`);
});

const bruteForceHash = (range: number, targetHash: string) => {
  for (let i = 0; i < range; i++) {
    // for some reason this produces a different hash than the solidity / ethers one
    // const hash = crypto
    //   .createHash("sha256")
    //   .update(new Uint8Array([i]))
    //   .digest("hex");
    const hash = ethers.utils.keccak256([i]);
    if (targetHash.includes(hash)) return i;
  }
  throw new Error(`No hash found within range ${range}`);
};

it("solves the challenge", async function () {
  const number = bruteForceHash(
    2 ** 8,
    `0xdb81b4d58595fbbbb592d3661a34cdca14d7ab379441400cbfa1b78bc447c365`
  );
  console.log(`Secret number was ${number}`);
  const tx = await contract.guess(number, {
    value: ethers.utils.parseEther(`1`),
  });
  const txHash = tx && tx.hash;
  console.log(formatEtherscanTx(txHash));

  const isComplete = await contract.isComplete()
  expect(isComplete).to.be.true;
});
