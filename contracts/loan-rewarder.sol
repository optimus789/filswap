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
    uint public loanPool;
    uint public lenderCount;
    uint public totalInterestAmount;
    uint public returnedActorId;

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
        IERC20(0xC0f020c8cF91Ca8C4df61145Ac92Ad1f87a27d06).transferFrom(0xb7e0BD7F8EAe0A33f968a1FfB32DE07C749c7390, msg.sender, msg.value);
        if(lenderData[msg.sender].lentAmount == 0){
            lenderCount+=1;
        }
        lenderData[msg.sender].lentAmount += msg.value;
        lendPool += msg.value;
        loanPool += msg.value;
    }

    function checkActorandDeal(uint64 actorId, uint64 dealId) public {
        MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(MarketTypes.GetDealProviderParams({id: dealId}));
        require(providerRet.provider == actorId, "Wrong Actor Id for given deal ID ");
        returnedActorId = providerRet.provider;
    }

    function borrowAmount(uint64 actorId, uint64 dealId, uint loanPeriod) public {
        require(borrowerData[actorId].borrowedAmount <= 0, "Already pending loan, please clear the emis then request for another loan");
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
        require(loanAmount < loanPool, "LoanPool is dry ");
        uint interestAmount = getPercentageOf(loanAmount, interestPercent);
        send(actorId, loanAmount);
        borrowerData[actorId].borrowedAmount += (loanAmount+interestAmount);
        borrowerData[actorId].emiAmount = uint(borrowerData[actorId].borrowedAmount) / loanPeriod;
        loanPool -= loanAmount;
    }
    
    function payEmi(uint64 actorId) public payable{
        require(borrowerData[actorId].borrowedAmount > 0, "Already paid, now rest or request for another Loan");
        require(borrowerData[actorId].emiAmount == msg.value, "Wrong value for paying Emi");
        // MarketTypes.GetDealProviderReturn memory providerRet = MarketAPI.getDealProvider(MarketTypes.GetDealProviderParams({id: dealId}));
        // require(providerRet.provider == actorId, "Wrong Actor Id for given deal ID ");
        uint actorScore = borrowerData[actorId].creditScore;
        uint newCreditFactor = uint(actorScore)/100;
        uint currCreditFactor = borrowerData[actorId].currCreditFactor;
        if(newCreditFactor > currCreditFactor){
            borrowerData[actorId].currCreditFactor = newCreditFactor;
        }
        
        uint interestAmount = getPercentageOf(msg.value,borrowerData[actorId].interestPercent);
        totalInterestAmount += interestAmount;
        borrowerData[actorId].borrowedAmount = borrowerData[actorId].borrowedAmount - msg.value;
        borrowerData[actorId].returnedAmount += msg.value;
        borrowerData[actorId].creditScore += 20;
        loanPool += msg.value;
    }

    function setCloseLoan(uint64 actorId) public{
        require(borrowerData[actorId].borrowedAmount < borrowerData[actorId].emiAmount , "Please Pay the remaining Emi");
        borrowerData[actorId].borrowedAmount = 0;
    }

    function setCreditScore(uint64 actorId, uint creditScore) public {
        require(msg.sender == owner, "Only owner will call");
        borrowerData[actorId].creditScore = creditScore;
    }


    function getEmiData(uint64 actorId) public view returns(uint,uint){
        return (borrowerData[actorId].emiAmount, borrowerData[actorId].borrowedAmount);
    }

    function contractPublicData() public view returns(uint,uint,uint,uint){
        return (lendPool, loanPool, lenderCount, totalInterestAmount);
    }

    function getLenderData(address lender, uint sharePercent) public view returns(uint,uint,uint,uint){
        uint amount = lenderData[lender].lentAmount;
        uint interestAmount = getPercentageOf(totalInterestAmount, sharePercent);
        return (amount, lendPool, loanPool, interestAmount);
    }

    function withdraw() public {
        payable(owner).transfer(address(this).balance);
    }

    function getLenderAmount(address lender) public view returns(uint,uint,uint){
        uint amount = lenderData[lender].lentAmount;
        return (amount, lendPool, loanPool);
    }

    // used in Percentage conversion.
    function getPercentageOf(uint256 _amount, uint256 _basisPoints) internal pure returns (uint256 value) {
        value = uint(_amount * _basisPoints) / 100;
    }

    function revokeLend(uint interestAmount, uint revokeLendAmount) public payable{
        require(lenderData[msg.sender].lentAmount == revokeLendAmount, "Please send the total lent amount");
        require(revokeLendAmount + interestAmount < loanPool, "Loan Pool is Dry");
        require(revokeLendAmount + interestAmount < lendPool, "Lend Pool is Dry");
        require(totalInterestAmount >= interestAmount, "Wrong interest amount entered");
        IERC20(0xC0f020c8cF91Ca8C4df61145Ac92Ad1f87a27d06).transferFrom(msg.sender, 0xb7e0BD7F8EAe0A33f968a1FfB32DE07C749c7390, revokeLendAmount);
        payable(msg.sender).transfer(revokeLendAmount + interestAmount);
        lenderData[msg.sender].lentAmount -= revokeLendAmount;
        totalInterestAmount -= interestAmount;
        lendPool -= revokeLendAmount + interestAmount;
        loanPool -= revokeLendAmount + interestAmount;
    }

    // send 1 FIL to the filecoin actor at actor_id
    function send(uint64 actorID, uint amount) internal {
        bytes memory emptyParams = "";
        delete emptyParams;

        HyperActor.call_actor_id(METHOD_SEND, amount, DEFAULT_FLAG, Misc.NONE_CODEC, emptyParams, actorID);

    }

}

