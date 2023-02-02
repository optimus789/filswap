// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { MarketAPI } from "../lib/filecoin-solidity/contracts/v0.8/MarketAPI.sol";
import { MarketTypes } from "../lib/filecoin-solidity/contracts/v0.8/types/MarketTypes.sol";
import { Actor, HyperActor } from "../lib/filecoin-solidity/contracts/v0.8/utils/Actor.sol";
import { Misc } from "../lib/filecoin-solidity/contracts/v0.8/utils/Misc.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* 
Contract Usage
    This contract is solely for the purpose of lending and borrowing Fil tokens 
    to provide loans to Storage providers for there hardware costs.
*/
contract loanRewarder {
    address public owner;
    address constant CALL_ACTOR_ID = 0xfe00000000000000000000000000000000000005;
    uint64 constant DEFAULT_FLAG = 0x00000000;
    uint64 constant METHOD_SEND = 0;

    struct BorrowerLedger {
        uint borrowedAmount;
        uint interestPercent;
        uint emiAmount;
        uint returnedAmount;
        uint currCreditFactor;
        uint creditScore;
        uint64 dealId;
        uint loanPeriod;
    }

    uint public lendPool;
    uint public lenderCount;
    uint public totalInterestAmount;
    mapping(uint64 => BorrowerLedger) public borrowerData;
    
    struct LentLedger {
        uint lentAmount;
        uint interestAccrued;
    }

    mapping(address => LentLedger) public lenderData;

    constructor() {
        owner = msg.sender;
    }

    
    function fund(address from, uint64 unused) public payable {}

    function lendAmount() public payable {
        IERC20(0xC0f020c8cF91Ca8C4df61145Ac92Ad1f87a27d06).transferFrom(0x5C5D541Af63470388fD8A4fC1bcb0AA8e0C58797, msg.sender, msg.value);
        if(lenderData[msg.sender].lentAmount != 0){
            lenderCount+=1;
        }
        lenderData[msg.sender].lentAmount += msg.value;
        lendPool += msg.value;
    }

    function borrowAmount(uint64 actorId, uint64 dealId, uint loanPeriod) public {
        require(borrowerData[actorId].borrowedAmount > 0, "Already pending loan, please clear the emis then request for another loan");
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(MarketTypes.GetDealProviderParams({id: dealId}));
        require(providerRet.provider == actorId, "Wrong Actor Id for given deal ID ");
        uint actorScore = borrowerData[actorId].creditScore;
        uint creditFactor = uint(actorScore)/100;
        borrowerData[actorId].currCreditFactor = creditFactor;
        uint interestPercent;
        if(creditFactor >= 10){
            interestPercent = 0;
        }
        else{
            interestPercent = 10 - creditFactor;
        }
        borrowerData[actorId].interestPercent = interestPercent;
        borrowerData[actorId].loanPeriod = loanPeriod;
        uint loanAmount = 1000000000000000000 + (100000000000000000*creditFactor);
        uint interestAmount = getPercentageOf(loanAmount, interestPercent);
        send(actorId, loanAmount);
        borrowerData[actorId].borrowedAmount += (loanAmount+interestAmount);
        borrowerData[actorId].emiAmount = uint(borrowerData[actorId].borrowedAmount) / loanPeriod;
    }
    function payEmi(uint64 actorId, uint64 dealId) public payable{
        require(borrowerData[actorId].borrowedAmount > 0, "Already paid, now rest or request for another Loan");
        require(borrowerData[actorId].emiAmount == msg.value, "Wrong value for paying Emi");
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(MarketTypes.GetDealProviderParams({id: dealId}));
        require(providerRet.provider == actorId, "Wrong Actor Id for given deal ID ");
        uint actorScore = borrowerData[actorId].creditScore;
        uint newCreditFactor = uint(actorScore)/100;
        uint currCreditFactor = borrowerData[actorId].currCreditFactor;
        if(newCreditFactor > currCreditFactor){
            borrowerData[actorId].currCreditFactor = newCreditFactor;
        }
        
        uint interestAmount = getPercentageOf(msg.value,borrowerData[actorId].interestPercent);
        //new idea here the totalInterestAmount we can say we will add this in a seperate liquidity pool where the tokens 
        //lenders earn can be swapped with fil using this interestAmount or idk maybe some other token
        //what should be done of this interestAmount
        totalInterestAmount += interestAmount;
        borrowerData[actorId].borrowedAmount = borrowerData[actorId].borrowedAmount - msg.value;
        borrowerData[actorId].returnedAmount += msg.value;
        borrowerData[actorId].creditScore += 20;
    }

    function getEmiData(uint64 actorId) public view returns(uint,uint){
        return (borrowerData[actorId].emiAmount, borrowerData[actorId].borrowedAmount);
    }

    function contractPublicData() public view returns(uint,uint,uint){
        return (lendPool, lenderCount, totalInterestAmount);
    }

    function getLenderData(address lender, uint sharePercent) public view returns(uint,uint,uint){
        uint amount = lenderData[lender].lentAmount;
        uint interestAmount = getPercentageOf(totalInterestAmount, sharePercent);
        return (amount, lendPool, interestAmount);
    }

    function getLenderAmount(address lender) public view returns(uint,uint){
        uint amount = lenderData[lender].lentAmount;
        return (amount, lendPool);
    }

    // used in Percentage conversion.
    function getPercentageOf(uint256 _amount, uint256 _basisPoints) internal pure returns (uint256 value) {
        value = uint(_amount * _basisPoints) / 100;
    }

    function revokeLend(uint interestAmount) public payable{
        require(lenderData[msg.sender].lentAmount == msg.value, "Please send the total lent amount");
        require(totalInterestAmount > interestAmount, "Wrong interest amount entered");
        IERC20(0xC0f020c8cF91Ca8C4df61145Ac92Ad1f87a27d06).transferFrom(msg.sender, 0x5C5D541Af63470388fD8A4fC1bcb0AA8e0C58797, msg.value);
        payable(msg.sender).transfer(msg.value + interestAmount);
        lenderData[msg.sender].lentAmount -= msg.value;
        totalInterestAmount -= interestAmount;
    }

    // send 1 FIL to the filecoin actor at actor_id
    function send(uint64 actorID, uint amount) internal {
        bytes memory emptyParams = "";
        delete emptyParams;

        HyperActor.call_actor_id(METHOD_SEND, amount, DEFAULT_FLAG, Misc.NONE_CODEC, emptyParams, actorID);

    }

}

