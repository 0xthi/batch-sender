const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const prompts = require('prompts');
const ethers = require('ethers');
const MultiSenderSDK = require('./MultiSenderSDK');
require('dotenv').config();

// Configuration
const providerUrl = process.env.RPC_URL;
const privateKey = process.env.TESTNET_PRIVATE_KEY;

// Load contract address from deployed addresses file
const addressesFilePath = path.resolve(__dirname, '../deployed', 'addresses.json');
const addresses = JSON.parse(fs.readFileSync(addressesFilePath, 'utf-8'));
const contractAddress = addresses.proxyAddress;


// Validate configuration
if (!providerUrl || !privateKey || !contractAddress) {
    console.error('Please set your providerUrl, privateKey, and contractAddress in the script.');
    process.exit(1);
}

if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error('Invalid private key format. It should be a 66-character string starting with 0x.');
    process.exit(1);
}

const multiSender = new MultiSenderSDK(providerUrl, privateKey, contractAddress);

async function processCSV(filePath, isVariable, decimals) {
    return new Promise((resolve, reject) => {
        const results = [];
        let headers;
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('headers', (headerList) => {
                headers = headerList;
            })
            .on('data', (data) => {
                if (isVariable) {
                    if (data.address && data.amount) {
                        results.push({ address: data.address, amount: ethers.utils.parseUnits(data.amount, decimals) });
                    } else {
                        reject(new Error('Invalid CSV format for variable amounts. Expected address and amount.'));
                    }
                } else {
                    if (headers.length === 1 && data[headers[0]]) {
                        results.push(data[headers[0]]);
                    } else {
                        reject(new Error('Invalid CSV format for fixed amounts. Expected only addresses.'));
                    }
                }
            })
            .on('end', () => {
                if (isVariable && results.length === 0) {
                    reject(new Error('No data found in CSV file.'));
                }
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

async function main() {
    try {
        const transactionTypeResponse = await prompts({
            type: 'select',
            name: 'transactionType',
            message: 'What type of transaction would you like to perform?',
            choices: [
                { title: 'Batch ERC-20', value: 'Batch ERC-20' },
                { title: 'Batch Ether', value: 'Batch Ether' },
            ],
        });

        const transactionType = transactionTypeResponse.transactionType;

        let tokenAddress, tokenSymbol, tokenDecimals;
        if (transactionType === 'Batch ERC-20') {
            const tokenAddressResponse = await prompts({
                type: 'text',
                name: 'tokenAddress',
                message: 'Enter the token address:',
                validate: value => /^0x[a-fA-F0-9]{40}$/.test(value) ? true : 'Invalid token address. Please enter a valid address.'
            });
            tokenAddress = tokenAddressResponse.tokenAddress;

            const tokenDetails = await multiSender.getTokenDetails(tokenAddress);
            tokenSymbol = tokenDetails.symbol;
            tokenDecimals = tokenDetails.decimals;
        }

        let isDeflationary;
        if (transactionType === 'Batch ERC-20') {
            const deflationaryResponse = await prompts({
                type: 'select',
                name: 'deflationary',
                message: 'Is the token deflationary?',
                choices: [
                    { title: 'Yes', value: true },
                    { title: 'No', value: false },
                ],
            });

            isDeflationary = deflationaryResponse.deflationary;
        } else {
            // Default to false for Ether transactions
            isDeflationary = false;
        }

        const amountTypeResponse = await prompts({
            type: 'select',
            name: 'amountType',
            message: 'Do you want to send a fixed or variable amount?',
            choices: [
                { title: 'Fixed', value: 'Fixed' },
                { title: 'Variable', value: 'Variable' },
            ],
        });

        const amountType = amountTypeResponse.amountType;
        let filePath = amountType === 'Fixed' ? './src/fixed.csv' : './src/variable.csv';
        let addresses, amounts;

        if (amountType === 'Fixed') {
            const amountResponse = await prompts({
                type: 'text',
                name: 'amount',
                message: 'Enter the fixed amount:',
                validate: value => !isNaN(parseFloat(value)) && parseFloat(value) > 0 ? true : 'Invalid amount. Please enter a positive number.'
            });
            const fixedAmount = ethers.utils.parseUnits(amountResponse.amount, transactionType === 'Batch ERC-20' ? tokenDecimals : 18);

            addresses = await processCSV(filePath, false, tokenDecimals);
            amounts = new Array(addresses.length).fill(fixedAmount);
        } else {
            const results = await processCSV(filePath, true, transactionType === 'Batch ERC-20' ? tokenDecimals : 18);
            addresses = results.map(r => r.address);
            amounts = results.map(r => r.amount);
        }

        console.log(`Number of addresses: ${addresses.length}`);
        const totalAmount = amounts.reduce((acc, curr) => acc.add(curr), ethers.BigNumber.from(0));
        console.log(`Total amount: ${ethers.utils.formatUnits(totalAmount, transactionType === 'Batch ERC-20' ? tokenDecimals : 18)} ${transactionType === 'Batch ERC-20' ? tokenSymbol : 'ETH'}`);

        const estimateOrProceedResponse = await prompts({
            type: 'select',
            name: 'action',
            message: 'Would you like to estimate gas or proceed with the transaction?',
            choices: [
                { title: 'Estimate Gas', value: 'Estimate Gas' },
                { title: 'Proceed Transaction', value: 'Proceed Transaction' }
            ],
        });

        const action = estimateOrProceedResponse.action;

        if (action === 'Estimate Gas') {
            let gasEstimate;

            if (transactionType === 'Batch ERC-20') {
                gasEstimate = await multiSender.estimateBatchSendERC20(tokenAddress, addresses, amounts);
            } else if (transactionType === 'Batch Ether') {
                gasEstimate = await multiSender.estimateBatchSendEther(addresses, amounts);
            }

            console.log(`Estimated Gas: ${gasEstimate.estimatedGas.toString()}`);
            console.log(`Gas Price: ${ethers.utils.formatUnits(gasEstimate.gasPrice, 'gwei')} Gwei`);
            console.log(`Total Fee: ${ethers.utils.formatUnits(gasEstimate.totalFee, transactionType === 'Batch ERC-20' ? tokenDecimals : 'ether')} ${transactionType === 'Batch ERC-20' ? tokenSymbol : 'ETH'}`);

            const proceedResponse = await prompts({
                type: 'confirm',
                name: 'proceed',
                message: 'Would you like to proceed with the transaction?',
            });

            if (!proceedResponse.proceed) {
                console.log('Transaction cancelled.');
                return;
            }
        }

        console.log('Processing transactions...');

        if (transactionType === 'Batch ERC-20') {
            if (amountType === 'Fixed') {
                if (isDeflationary) {
                    await multiSender.batchSendFixedERC20Deflationary(tokenAddress, addresses, amounts[0]);
                } else {
                    await multiSender.batchSendFixedERC20(tokenAddress, addresses, amounts[0]);
                }
            } else {
                if (isDeflationary) {
                    await multiSender.batchSendERC20Deflationary(tokenAddress, addresses, amounts);
                } else {
                    await multiSender.batchSendERC20(tokenAddress, addresses, amounts);
                }
            }
        } else {
            if (amountType === 'Fixed') {
                await multiSender.batchSendFixedEther(addresses, amounts[0], totalAmount);
            } else {
                await multiSender.batchSendEther(addresses, amounts, totalAmount);
            }
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

main();
