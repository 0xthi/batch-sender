# BATCH SENDER SDK
  This SDK supports batching transaction for all types of ERC20 (including deflation token) and Ether based tokens. User have to upload or edit .csv file that is already 
  available to send batch transactions which saves upto 90% of gas and saves time.
  
## How to use this SDK locally
1. Clone the repo `git clone `
2. Run `npm install` to install all the required packages.
3. To test compile and test contracts run `npx hardhat compile`(already compiled) & `npx hardhat test`
4. To deploy contracts and use batching, add RPC_URL, PRIVATE_KEY to `.env` file for which format is available in `.envformat`
5. Use command `npx hardhat run scripts/0_deploy_sender.ts --network bsctest` to deploy in bsctestnet
6. Use command `npx hardhat verify --network bsctest (contractaddress)` to verify those contracts.
7. Now before running SDK, replace `fixed.csv` or `variable.csv` with your own address and amount.
   FIXED - Amounts are same for all recipients. Only address is required in `fixed.csv` file
   VARIABLE - Amounts are not same for all recipients. It has addresses and amounts seperated by comma in `variable.csv`
8. After setting up everything run `node src/cli.js` to start the SDK.

## Options available

### BatchSendEther

You can either send Ether in Fixed or variable amount. Gas estimation is available. 

### BatchSendERC20

Likewise Ether, fixed or variable option is available. Along with that, option of enabling deflation token is available. If allowance is not enough, those can be set.
