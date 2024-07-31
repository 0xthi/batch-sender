const { ethers } = require('ethers');
const prompts = require('prompts');
const abi = require('../abi/MultiSender.json');

class MultiSenderSDK {
    constructor(providerUrl, privateKey, contractAddress) {
        this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(contractAddress, abi, this.wallet);
    }

    async getGasPrice() {
        const gasPrice = await this.provider.getGasPrice();
        return gasPrice;
    }

    async getTokenDetails(tokenAddress) {
        const tokenContract = new ethers.Contract(tokenAddress, [
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ], this.provider);
        
        const [symbol, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals()
        ]);
        
        return { symbol, decimals };
    }

    async estimateBatchSendERC20(tokenAddress, targets, amounts) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, [
                "function allowance(address owner, address spender) view returns (uint256)"
            ], this.wallet);

            const tokenDetails = await this.getTokenDetails(tokenAddress);
            const decimals = tokenDetails.decimals;
            const totalAmount = amounts.reduce((acc, curr) => acc.add(curr), ethers.BigNumber.from(0));
            const gasPrice = await this.getGasPrice();

            // Estimate Gas
            const gasEstimate = await this.contract.estimateGas.batchSendERC20(
                tokenAddress, targets, amounts
            );

            const totalFee = gasEstimate.mul(gasPrice);
            return {
                estimatedGas: gasEstimate,
                gasPrice: gasPrice,
                totalFee: totalFee
            };
        } catch (error) {
            throw new Error(`Failed to estimate gas: ${error.message}`);
        }
    }

    async estimateBatchSendEther(targets, amounts) {
        try {
            const gasPrice = await this.getGasPrice();
            const totalAmount = amounts.reduce((acc, curr) => acc.add(curr), ethers.BigNumber.from(0));
            
            // Estimate Gas
            let gasEstimate;
            try {
                gasEstimate = await this.contract.estimateGas.batchSendEther(targets, amounts);
            } catch (error) {
                console.error(`Gas estimation failed: ${error.message}`);
                // Retry with a higher gas limit
                gasEstimate = await this.contract.estimateGas.batchSendEther(targets, amounts);
            }
    
            const totalFee = gasEstimate.mul(gasPrice);
            return {
                estimatedGas: gasEstimate,
                gasPrice: gasPrice,
                totalFee: totalFee
            };
        } catch (error) {
            throw new Error(`Failed to estimate gas: ${error.message}`);
        }
    }
    
    async batchSendERC20(tokenAddress, targets, amounts) {
        try {
            console.log('Starting batch ERC-20 transaction...');

            const tokenContract = new ethers.Contract(tokenAddress, [
                "function allowance(address owner, address spender) view returns (uint256)",
                "function approve(address spender, uint256 amount) returns (bool)"
            ], this.wallet);

            const tokenDetails = await this.getTokenDetails(tokenAddress);
            const decimals = tokenDetails.decimals;
            const totalAmount = amounts.reduce((acc, curr) => acc.add(curr), ethers.BigNumber.from(0));
            
            const allowance = await tokenContract.allowance(this.wallet.address, this.contract.address);
            if (allowance.lt(totalAmount)) {
                const amountToApprove = totalAmount.sub(allowance);
                const approvalPrompt = await prompts({
                    type: 'confirm',
                    name: 'approve',
                    message: `Allowance is insufficient. You need to approve ${ethers.utils.formatUnits(amountToApprove, decimals)} tokens. Proceed with setting allowance?`,
                    initial: true
                });

                if (approvalPrompt.approve) {
                    console.log(`Setting allowance of ${ethers.utils.formatUnits(amountToApprove, decimals)} tokens...`);
                    const txApprove = await tokenContract.approve(this.contract.address, totalAmount);
                    const receiptApprove = await txApprove.wait();
                    console.log(`Allowance set: ${txApprove.hash}`);
                } else {
                    console.log('Transaction cancelled.');
                    return;
                }
            }

            console.log(`Proceeding with batch ERC-20 transfer...`);
            const tx = await this.contract.batchSendERC20(tokenAddress, targets, amounts);
            const receipt = await tx.wait();
            console.log(`Transaction successful: ${tx.hash}`);
            console.log(`Used gas: ${ethers.utils.formatUnits(receipt.gasUsed.toString(), 'gwei')} gwei`);
        } catch (error) {
            console.error(`Transaction failed: ${error.message}`);
        }
    }

    async batchSendFixedERC20(tokenAddress, targets, amount) {
        try {
            console.log('Starting batch fixed ERC-20 transaction...');

            const tokenContract = new ethers.Contract(tokenAddress, [
                "function allowance(address owner, address spender) view returns (uint256)",
                "function approve(address spender, uint256 amount) returns (bool)"
            ], this.wallet);

            const tokenDetails = await this.getTokenDetails(tokenAddress);
            const decimals = tokenDetails.decimals;
            const totalAmount = amount.mul(targets.length);
            
            const allowance = await tokenContract.allowance(this.wallet.address, this.contract.address);
            if (allowance.lt(totalAmount)) {
                const amountToApprove = totalAmount.sub(allowance);
                const approvalPrompt = await prompts({
                    type: 'confirm',
                    name: 'approve',
                    message: `Allowance is insufficient. You need to approve ${ethers.utils.formatUnits(amountToApprove, decimals)} tokens. Proceed with setting allowance?`,
                    initial: true
                });

                if (approvalPrompt.approve) {
                    console.log(`Setting allowance of ${ethers.utils.formatUnits(amountToApprove, decimals)} tokens...`);
                    const txApprove = await tokenContract.approve(this.contract.address, totalAmount);
                    const receiptApprove = await txApprove.wait();
                    console.log(`Allowance set: ${txApprove.hash}`);
                } else {
                    console.log('Transaction cancelled.');
                    return;
                }
            }

            console.log(`Proceeding with batch fixed ERC-20 transfer...`);
            const tx = await this.contract.batchSendFixedERC20(tokenAddress, targets, amount);
            const receipt = await tx.wait();
            console.log(`Transaction successful: ${tx.hash}`);
            console.log(`Used gas: ${ethers.utils.formatUnits(receipt.gasUsed.toString(), 'gwei')} gwei`);
        } catch (error) {
            console.error(`Transaction failed: ${error.message}`);
        }
    }

    async batchSendEther(targets, amounts, totalAmount) {
        try {
            console.log('Starting batch Ether transaction...');
            const tx = await this.contract.batchSendEther(targets, amounts, { value: totalAmount });
            const receipt = await tx.wait();
            console.log(`Transaction successful: ${tx.hash}`);
            console.log(`Used gas: ${ethers.utils.formatUnits(receipt.gasUsed.toString(), 'gwei')} gwei`);
        } catch (error) {
            console.error(`Transaction failed: ${error.message}`);
        }
    }

    async batchSendFixedEther(targets, amount, totalAmount) {
        try {
            console.log('Starting batch fixed Ether transaction...');
            const tx = await this.contract.batchSendFixedEther(targets, amount, { value: totalAmount });
            const receipt = await tx.wait();
            console.log(`Transaction successful: ${tx.hash}`);
            console.log(`Used gas: ${ethers.utils.formatUnits(receipt.gasUsed.toString(), 'gwei')} gwei`);
        } catch (error) {
            console.error(`Transaction failed: ${error.message}`);
        }
    }
}

module.exports = MultiSenderSDK;
