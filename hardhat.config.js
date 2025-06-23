require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

console.log("ALCHEMY_API_URL:", process.env.ALCHEMY_API_URL);
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.ALCHEMY_API_URL,
      accounts: [process.env.PRIVATE_KEY],
      gas: "auto",
      gasPrice: "auto",
    },
  },
};
