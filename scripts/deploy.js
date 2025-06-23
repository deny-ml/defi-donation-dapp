const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check account balance using provider
  const provider = hre.ethers.provider;
  const balance = await provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy TestToken
  console.log("Deploying TestToken...");
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy(); 
  await testToken.waitForDeployment(); 
  console.log("TestToken deployed to:", await testToken.getAddress());

  // Deploy Donation
  console.log("Deploying Donation...");
  const Donation = await hre.ethers.getContractFactory("Donation");
  const donation = await Donation.deploy(await testToken.getAddress()); 
  await donation.waitForDeployment(); 
  console.log("Donation deployed to:", await donation.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});