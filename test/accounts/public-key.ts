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
    "PublicKeyChallenge"
  );
  contract = challengeFactory.attach(
    `0x66d0abcD3267338C26E4B97250A1295C1aA867fD`
  );
});

it("solves the challenge", async function () {
  // addresses are the last 20 bytes of hashing the public key
  // but transactions are signed with the address' public key
  // so if we see a transaction from this account we can recover the public key
  // from the message and the signature using ecrecover
  // https://ethereum.stackexchange.com/questions/13778/get-public-key-of-any-ethereum-account

  const owner = `0x92b28647ae1f3264661f72fb2eb9625a89d88a31`;
  // pick the only outgoing tx
  // https://ropsten.etherscan.io/tx/0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb
  const firstTxHash = `0xabc467bedd1d17462fcc7942d0af7874d6f8bdefee2b299c9168a216d3ff0edb`;
  const firstTx = await eoa.provider!.getTransaction(firstTxHash);
  expect(firstTx).not.to.be.undefined;
  console.log(`firstTx`, JSON.stringify(firstTx, null, 4));

  // the txHash is the keccak256 of the SIGNED transaction
  // what we need for ecrecover is what ECDSA actually signed, which is defined here
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
  const implementedEIP155 =
    2 * firstTx.chainId + 35 == firstTx.v! ||
    2 * firstTx.chainId + 36 == firstTx.v!;
  expect(implementedEIP155).to.be.true;

  // see also here https://github.com/ethereumjs/ethereumjs-tx/blob/master/src/transaction.ts#L177
  // can use this for debugging https://codechain-io.github.io/rlp-debugger/
  // const signingData = ethers.utils.RLP.encode([
  //   BigNumber.from(`9`).toHexString(),
  //   BigNumber.from(20 * 1e9).toHexString(),
  //   BigNumber.from(`21000`).toHexString(),
  //   `0x3535353535353535353535353535353535353535`,
  //   BigNumber.from(`10`).pow(`18`).toHexString(),
  //   ethers.utils.toUtf8Bytes(``),
  //   `0x01`,
  //   ethers.utils.toUtf8Bytes(``), // BUG in ethers?, should be encoding of 0 = 0x80
  //   ethers.utils.toUtf8Bytes(``), // but it's encoded as 0
  // ]);
  const txData = {
    gasPrice: firstTx.gasPrice,
    gasLimit: firstTx.gasLimit,
    value: firstTx.value,
    nonce: firstTx.nonce,
    data: firstTx.data,
    to: firstTx.to,
    chainId: firstTx.chainId
  };
  const signingDataRecomputed = ethers.utils.RLP.encode([
    BigNumber.from(firstTx.nonce).toHexString(),
    BigNumber.from(firstTx.gasPrice).toHexString(),
    BigNumber.from(firstTx.gasLimit).toHexString(),
    BigNumber.from(firstTx.to).toHexString(),
    BigNumber.from(firstTx.value).toHexString(),
    firstTx.data,
    BigNumber.from(firstTx.chainId).toHexString(),
    ethers.utils.toUtf8Bytes(``), // BUG in ethers?, should be encoding of 0 = 0x80
    ethers.utils.toUtf8Bytes(``), // but it's encoded as 0x00
  ]);
  const signingData = ethers.utils.serializeTransaction(txData)
  console.log(`signingData`, signingData)
  // expect(signingData).to.equal(signingDataRecomputed)

  const msgHash = ethers.utils.keccak256(signingData);
  console.log(`msgHash`, msgHash)
  const signature = { r: firstTx.r!, s: firstTx.s!, v: firstTx.v! };

  // bug in ethersjs, fails here with signature s out of range
  // const rawPublicKey = ethers.utils.recoverPublicKey(msgHash, signature);
  // const compressedPublicKey = ethers.utils.computePublicKey(rawPublicKey, true);
  // console.log(`Recovered public key ${rawPublicKey}, ${compressedPublicKey}`);

  // need to compute it ethereumjs-tx instead
  const rawPublicKey = `0x613a8d23bd34f7e568ef4eb1f68058e77620e40079e88f705dfb258d7a06a1a0364dbe56cab53faf26137bec044efd0b07eec8703ba4a31c588d9d94c35c8db4`

  tx = await contract.authenticate(rawPublicKey);
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
