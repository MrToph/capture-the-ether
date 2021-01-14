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
    "AccountTakeoverChallenge"
  );
  contract = challengeFactory.attach(
    `0x87F4258A257E4f54878fa77A1d534B1dC1Addd99`
  );
});

it("solves the challenge", async function () {
  // we need to steal the owner's private key to authenticate with the contract
  // the only thing to do is analyze this account and its transactions
  // at some point you see that the r (derived from k) values are being reused
  // now you have to know that this allows recomputing private keys in ECDSA
  // it was used in the famous sony hack and is even explained on ECDSA's wikipedia

  const owner = `0x6B477781b0e68031109f21887e6B5afEAaEB002b`;
  // pick the only outgoing tx
  // https://ropsten.etherscan.io/tx/0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb
  const tx1Hash = `0xd79fc80e7b787802602f3317b7fe67765c14a7d40c3e0dcb266e63657f881396`;
  const tx2Hash = `0x061bf0b4b5fdb64ac475795e9bc5a3978f985919ce6747ce2cfbbcaccaf51009`;
  const tx1 = await eoa.provider!.getTransaction(tx1Hash);
  const tx2 = await eoa.provider!.getTransaction(tx2Hash);
  expect(tx1).not.to.be.undefined;
  expect(tx2).not.to.be.undefined;
  console.log(`TX 1`, JSON.stringify(tx1, null, 4));
  console.log(`TX 2`, JSON.stringify(tx2, null, 4));

  // this makes exploit possible, same r (derived from k)
  expect(tx1.r).to.eq(tx2.r)

  // can now retrieve the private key as described in wikipedia
  // i did it in python for better low level elliptic curve libraries
  const signer = new ethers.Wallet(
    `0x614f5e36cd55ddab0947d1723693fef5456e5bee24738ba90bd33c0c6e68e269`,
    eoa.provider
  );

  console.log(
    `Recomputed EOA address: ${signer.address} (PK: ${signer.publicKey}) (sk: ${signer.privateKey})`
  );
  expect(signer.address).to.eq(owner)

  // need to send some gas to challenge owner EOA for calling authenticate
  tx = await eoa.sendTransaction({
    to: signer.address,
    value: ethers.utils.parseEther(`0.1`),
  });
  await signer.provider.waitForTransaction(tx.hash);
  tx = await contract.connect(signer).authenticate();
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
