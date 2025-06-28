// backend/src/services/baseChain.js
const { ethers } = require('ethers');
const axios = require('axios');

class BaseChainService {
  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
    this.chainId = process.env.BASE_CHAIN_ID;
    this.testConnection();
  }

  // Test the connection on startup
  async testConnection() {
    try {
      const network = await this.provider.getNetwork();
      console.log('✅ Connected to Base Chain:', network.name, 'Chain ID:', network.chainId);
    } catch (error) {
      console.error('❌ Failed to connect to Base Chain:', error.message);
    }
  }

  // Get wallet balance for ETH
  async getETHBalance(walletAddress) {
    try {
      const balance = await this.provider.getBalance(walletAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      throw new Error('Failed to get ETH balance');
    }
  }

  // Get ERC-20 token balance
  async getTokenBalance(walletAddress, tokenAddress, decimals = 18) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)',
          'function name() view returns (string)'
        ],
        this.provider
      );

      const balance = await tokenContract.balanceOf(walletAddress);
      const tokenDecimals = decimals || await tokenContract.decimals();
      
      return {
        balance: ethers.utils.formatUnits(balance, tokenDecimals),
        symbol: await tokenContract.symbol().catch(() => 'UNKNOWN'),
        name: await tokenContract.name().catch(() => 'Unknown Token'),
        decimals: tokenDecimals
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error('Failed to get token balance');
    }
  }

  // Get transaction history for a wallet
  async getTransactionHistory(walletAddress, fromBlock = 'latest', toBlock = 'latest') {
    try {
      // Get latest 10 transactions
      const latestBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, latestBlock - 10000); // Last ~10k blocks

      const history = await this.provider.getLogs({
        fromBlock: startBlock,
        toBlock: 'latest',
        topics: [
          null, // Any topic
          ethers.utils.hexZeroPad(walletAddress.toLowerCase(), 32) // To address
        ]
      });

      return history.slice(0, 50); // Limit to 50 most recent
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to get transaction history');
    }
  }

  // Get current gas price
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return ethers.utils.formatUnits(gasPrice, 'gwei');
    } catch (error) {
      console.error('Error getting gas price:', error);
      throw new Error('Failed to get gas price');
    }
  }

  // Validate wallet address
  isValidAddress(address) {
    try {
      console.log('Validating address:', address);
      
      if (!address) {
        console.log('Address is empty or null');
        return false;
      }
      
      // Remove any whitespace and ensure it starts with 0x
      const cleanAddress = address.trim();
      console.log('Clean address:', cleanAddress);
      
      if (!cleanAddress.startsWith('0x')) {
        console.log('Address does not start with 0x');
        return false;
      }
      
      if (cleanAddress.length !== 42) {
        console.log('Address length is not 42, actual:', cleanAddress.length);
        return false;
      }
      
      const result = ethers.utils.isAddress(cleanAddress);
      console.log('Ethers validation result:', result);
      return result;
      
    } catch (error) {
      console.error('Address validation error:', error);
      return false;
    }
  }

  // Get token info from contract
  async getTokenInfo(tokenAddress) {
    try {
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error('Invalid token address');
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function totalSupply() view returns (uint256)'
        ],
        this.provider
      );

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name().catch(() => 'Unknown'),
        tokenContract.symbol().catch(() => 'UNKNOWN'),
        tokenContract.decimals().catch(() => 18),
        tokenContract.totalSupply().catch(() => '0')
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply: ethers.utils.formatUnits(totalSupply, decimals)
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw new Error('Failed to get token info');
    }
  }
}

module.exports = new BaseChainService();