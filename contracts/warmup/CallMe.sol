pragma solidity ^0.4.21;

contract CallMeChallenge {
    bool public isComplete = false;

    function callme() public {
        isComplete = true;
    }
}