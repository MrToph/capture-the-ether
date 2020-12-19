pragma solidity ^0.7.3;

interface IFuzzyIdentityChallenge {
    function isComplete() external view returns (bool);

    function authenticate() external payable;
}

contract FuzzyIdentityAttacker {
    IFuzzyIdentityChallenge public challenge;
    
    constructor (address challengeAddress) {
        challenge = IFuzzyIdentityChallenge(challengeAddress);
    }

    function attack() external {
      challenge.authenticate();
    }

    function name() external pure returns (bytes32) {
      return bytes32("smarx");
    }

    receive() external payable {}
}