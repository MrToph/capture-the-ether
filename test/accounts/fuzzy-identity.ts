import crypto from "crypto";
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
    "FuzzyIdentityChallenge"
  );
  contract = challengeFactory.attach(
    `0x16d20B998E593eaFffB676f9F5923B1E2173234B`
  );
});

const NONCE = BigNumber.from(`0`);

// this takes ages
// an eth address is 20 bytes = 40 hex chars long
// badc0de is 7 hex chars
// 16^7 is 268,435,456 (!) it can occur on (34?) different positions
// but it's still several million hashes that need to be computed
// 16^7 / 34 = 7,895,160.470588235
// practicallly I also found a key after 7 million addresses
const findMatchingPrivateKey = () => {
  let foundKey: HDNode | undefined = undefined;
  // choose 512 bits of randomness like BIP39 would for when deriving seed from mnemonic
  // this is probably very inefficient compared to just deriving a key from randomness
  // as it involves several hash functions when deriving the key from index
  const masterKey = ethers.utils.HDNode.fromSeed(crypto.randomBytes(512 / 8));
  const getPathForIndex = (index: number) => `m/44'/60'/0'/0/${index}`;

  let counter = 0;

  while (!foundKey) {
    const key = masterKey.derivePath(getPathForIndex(counter));
    const from = key.address;
    const contractAddr = ethers.utils.getContractAddress({
      from,
      nonce: NONCE,
    });
    if (contractAddr.toLowerCase().includes(`badc0de`)) {
      foundKey = key;
    }

    counter++;
    if (counter % 1000 == 0) {
      console.log(`Checked ${counter} addresses`);
    }
  }

  return foundKey.privateKey;
};

it("solves the challenge", async function () {
  // need to create a contract that has a name() function returning "smarx"
  // in addition this smart contract address needs to have "badc0de" in it
  // so we need to create a vanity smart contract address
  // smart contract addresses are created as:
  // keccak256(rlp(senderAddress, nonce))[12:]
  // http://ethereum.stackexchange.com/questions/760/how-is-the-address-of-an-ethereum-contract-computed

  // so we brute force it by picking a random private key
  // deriving the address and choosing nonce = 0
  // const key = findMatchingPrivateKey()
  // const signer = new ethers.Wallet(key, eoa.provider)

  // Found EOA address: 0x53f2A7A12Da3c5551dDAEc1b86e28a4B777a75e4
  // (PK: 0x043534e7d8a9630ececd1a19086d4f47eb184f36472e51fc1abde5c47fd3411c52904ac77a2353e0aa4a0584543ac92681afa25e7dbdd0b52263a71f648138a45c)
  // (sk: 0x1318d64ef03445df72658516e50f1981cb0474b7a29bb019e3add89a86a40beb)
  // Smart contract address: 0xfBFe5821F56e42602f7baDC0dEbE123dfFd097Da
  const signer = new ethers.Wallet(
    `0x1318d64ef03445df72658516e50f1981cb0474b7a29bb019e3add89a86a40beb`,
    eoa.provider
  );

  console.log(
    `Found EOA address: ${signer.address} (PK: ${signer.publicKey}) (sk: ${signer.privateKey})`
  );
  console.log(
    `Smart contract address: ${ethers.utils.getContractAddress({
      from: signer.address,
      nonce: NONCE,
    })}`
  );

  // need to send some ETH to signer EOA for contract deployment
  tx = await eoa.sendTransaction({
    to: signer.address,
    value: ethers.utils.parseEther(`0.1`),
  });
  await signer.provider.waitForTransaction(tx.hash);

  console.log(`deploying ...`);
  const attackerFactory = await ethers.getContractFactory(
    "FuzzyIdentityAttacker"
  );
  attacker = await attackerFactory.connect(signer).deploy(contract.address, {
    nonce: NONCE,
  });
  await signer.provider.waitForTransaction(attacker.deployTransaction.hash);

  console.log(`attack ...`);
  tx = await attacker.attack();
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
