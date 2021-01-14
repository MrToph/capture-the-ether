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
  // const signingDataRecomputed = ethers.utils.RLP.encode([
  //   BigNumber.from(firstTx.nonce).toHexString(),
  //   BigNumber.from(firstTx.gasPrice).toHexString(),
  //   BigNumber.from(firstTx.gasLimit).toHexString(),
  //   BigNumber.from(firstTx.to).toHexString(),
  //   BigNumber.from(firstTx.value).toHexString(),
  //   firstTx.data,
  //   BigNumber.from(firstTx.chainId).toHexString(),
  //   ethers.utils.toUtf8Bytes(``), // BUG in ethers?, should be encoding of 0 = 0x80
  //   ethers.utils.toUtf8Bytes(``), // but it's encoded as 0x00
  // ]);
  const txData = {
    gasPrice: firstTx.gasPrice,
    gasLimit: firstTx.gasLimit,
    value: firstTx.value,
    nonce: firstTx.nonce,
    data: firstTx.data,
    to: firstTx.to,
    chainId: firstTx.chainId,
  };
  const signingData = ethers.utils.serializeTransaction(txData);
  console.log(`signingData`, signingData);

  const msgHash = ethers.utils.keccak256(signingData);
  console.log(`msgHash`, msgHash);

  // need to switch r and s because of a bug when using local hardhat providers
  // https://github.com/nomiclabs/hardhat/issues/1175
  // const signature = { r: firstTx.r!, s: firstTx.s!, v: firstTx.v! };
  const signature = { r: firstTx.s!, s: firstTx.r!, v: firstTx.v! };
  let rawPublicKey = ethers.utils.recoverPublicKey(msgHash, signature);
  const compressedPublicKey = ethers.utils.computePublicKey(rawPublicKey, true);
  // need to strip of the 0x04 prefix indicating that it's a raw public key
  expect(rawPublicKey.slice(2, 4), "not a raw public key").to.equal(`04`);
  rawPublicKey = `0x${rawPublicKey.slice(4)}`;
  console.log(`Recovered public key ${rawPublicKey}, ${compressedPublicKey}`);

  tx = await contract.authenticate(rawPublicKey);
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
