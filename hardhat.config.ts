import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "hardhat-docgen";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-solpp";

import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    // test networks
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
    },
    bsctest: {
      url: process.env.RPC_URL,
      accounts: [process.env.TESTNET_PRIVATE_KEY || ''],
    },
    sepolia: {
      url: process.env.RPC_URL,
      accounts: [process.env.TESTNET_PRIVATE_KEY || ''],
    },
    // main networks
    ethereum: {
      url: "https://eth-mainnet.g.alchemy.com/v2/ThP75c4L-jDh9F9d8_icKVhT9r9xdDRu",
      accounts: [process.env.MAINNET_PRIVATE_KEY || ''],
    },
    polygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/HnyOE6plvFb9l5AQfiE6vDYmE83bCrnd",
      accounts: [process.env.MAINNET_PRIVATE_KEY || ''],
      gasPrice: 60_000_000_000,
    },
    polygonamoy: {
      url: process.env.RPC_URL || '',
      accounts: [process.env.TESTNET_PRIVATE_KEY || ''],
    },
    bsc: {
      url: "https://bsc-dataseed1.defibit.io/",
      accounts: [process.env.MAINNET_PRIVATE_KEY || ''],
    },
    moonbeam: {
      url: "https://rpc.api.moonbeam.network",
      accounts: [process.env.MAINNET_PRIVATE_KEY || ''],
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: "polygonamoy",
        chainId: 80002, // Ensure this matches the actual chain ID
        urls: {
          apiURL: "https://polygon-amoy.g.alchemy.com/v2/Z63eRknGRKayFksi5zbqwCj_pr9baRm8", // Replace with the actual API URL for your custom network
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5',
  },
  abiExporter: {
    path: './abi',
    runOnCompile: true,
    clear: false,
    flat: true,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: false,
    strict: true,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
  solpp: {
    noFlatten: true,
  },
  mocha: {
    timeout: 100000,
  },
};

export default config;
