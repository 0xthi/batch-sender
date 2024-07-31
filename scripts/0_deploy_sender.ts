import { ethers, upgrades } from "hardhat";
import { green } from "colors";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(green(`Deploying contracts with the account: ${deployer.address}`));

  const MultiSender = await ethers.getContractFactory("MultiSender");
  const multisender = await upgrades.deployProxy(MultiSender, [], { initializer: 'initialize' });
  await multisender.deployed();

  console.log(green(`MultiSender deployed to proxy address: ${multisender.address}`));
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(multisender.address);
  console.log(green(`MultiSender implementation deployed to: ${implementationAddress}`));

  const addresses = {
    proxyAddress: multisender.address,
    implementationAddress: implementationAddress
  };

  const deployedDir = path.join(__dirname, "..", "deployed");
  if (!fs.existsSync(deployedDir)) {
    fs.mkdirSync(deployedDir);
  }

  const filePath = path.join(deployedDir, "addresses.json");
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2), "utf-8");
  console.log(green(`Addresses saved to ${filePath}`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
