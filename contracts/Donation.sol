// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Donation {
    address public owner;
    IERC20 public token;
    uint256 public totalDonations;
    mapping(address => uint256) public donations;

    event Donated(address indexed donor, uint256 amount);

    constructor(address _tokenAddress) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
    }

    function donate(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        donations[msg.sender] += amount;
        totalDonations += amount;
        emit Donated(msg.sender, amount);
    }

    function getDonation(address donor) external view returns (uint256) {
        return donations[donor];
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        token.transfer(owner, balance);
    }
}