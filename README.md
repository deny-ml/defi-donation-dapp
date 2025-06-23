# DeFi Donation DApp

A decentralized donation platform built on Ethereum's Sepolia Testnet, allowing users to donate TestToken (TTK) securely using MetaMask. This project showcases a modern, user-friendly interface with a finance-themed design and robust Web3 integration.

## Contracts
- **TestToken**: `0x008f4592f43A280d553A56e8f237B846Aeee4134`
- **Donation**: `0x00Ce02F63d01aB52996E17f422698A04ac651abc`

## Features
- **Donation Validation**: Ensures donations are greater than 0 TTK.
- **Professional Notifications**: Success (green) and error (red) messages with slide-in animations.
- **Wallet Management**: Connect/disconnect MetaMask with session handling and automatic reconnection after refresh.
- **Donation History**: Displays successful transactions with links to Sepolia Etherscan.
- **Modern UI**: Finance-themed design (dark blue #1A2E4A, gold #F4A261) with gradients, animations, and responsive layout.
- **Robust Data Fetching**: Fetches token balance with Alchemy API and falls back to contract calls if needed.
- **Error Handling**: Manages network issues, transaction failures, and API errors with retries.
- **Tech Stack**: React, Ethers.js, Alchemy SDK, Hardhat, and MetaMask.

## Setup
1. **Clone Repository**:
   ```bash
   git clone https://github.com/deny-ml/defi-donation-dapp.git
   cd defi-donation-dapp