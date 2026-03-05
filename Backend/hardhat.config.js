require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

module.exports = {

  solidity: {
    compilers: [
      {
        version: "0.8.27"
      },
      {
        version: "0.6.11"
      }
    ]
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 20,
    outputFile: 'gas-report.txt', // Output file where results will be saved
    noColors: true,
    outputFilePrecision: 2, // Set precision level
  },
  plugins: ["truffle-plugin-verify", "eth-gas-reporter"],
  gasReporter: {
    enabled: true,
    currency: "USD",
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};