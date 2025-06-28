// backend/src/services/transactionService.js
const axios = require('axios');
const { ethers } = require('ethers');
const baseChain = require('./baseChain');
const tokenService = require('./tokenService');

class TransactionService {
  constructor() {
    this.provider = baseChain.provider;
    
    // Common DEX routers and contract addresses on Base
    this.knownContracts = {
      // Uniswap V3 on Base
      '0x2626664c2603336E57B271c5C0b26F421741e481': { name: 'Uniswap V3 Router', type: 'DEX' },
      // Base Bridge
      '0x49048044D57e1C92A77f79988d21Fa8fAF74E97e': { name: 'Base Bridge', type: 'Bridge' },
      // USDC Contract
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { name: 'USDC Token', type: 'Token' },
      // WETH Contract
      '0x4200000000000000000000000000000000000006': { name: 'WETH Token', type: 'Token' }
    };

    // ERC-20 Transfer event signature
    this.transferSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  }

  // Get transaction history for a wallet
  async getTransactionHistory(walletAddress, limit = 50) {
    try {
      const transactions = [];
      
      // Get regular ETH transactions
      const ethTransactions = await this.getEthTransactions(walletAddress, limit);
      transactions.push(...ethTransactions);

      // Get token transfer events
      const tokenTransfers = await this.getTokenTransfers(walletAddress, limit);
      transactions.push(...tokenTransfers);

      // Sort by timestamp (newest first)
      const sortedTransactions = transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      // Add USD values and additional data
      const enrichedTransactions = await this.enrichTransactions(sortedTransactions);

      return {
        transactions: enrichedTransactions,
        totalCount: enrichedTransactions.length,
        walletAddress,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error('Failed to get transaction history');
    }
  }

  // Get ETH transactions
  async getEthTransactions(walletAddress, limit) {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 10000); // Last ~10k blocks

      const transactions = [];
      
      // Get transactions where wallet is sender or receiver
      for (let i = 0; i < Math.min(limit, 100); i++) {
        try {
          const blockNumber = latestBlock - i;
          const block = await this.provider.getBlockWithTransactions(blockNumber);
          
          for (const tx of block.transactions) {
            if (tx.from?.toLowerCase() === walletAddress.toLowerCase() || 
                tx.to?.toLowerCase() === walletAddress.toLowerCase()) {
              
              const receipt = await this.provider.getTransactionReceipt(tx.hash);
              
              transactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.utils.formatEther(tx.value || '0'),
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: ethers.utils.formatUnits(tx.gasPrice || '0', 'gwei'),
                blockNumber: tx.blockNumber,
                timestamp: block.timestamp,
                type: this.determineTransactionType(tx, walletAddress),
                status: receipt.status === 1 ? 'success' : 'failed',
                asset: 'ETH',
                direction: tx.from?.toLowerCase() === walletAddress.toLowerCase() ? 'out' : 'in'
              });
            }
          }
        } catch (blockError) {
          console.log(`Error processing block ${latestBlock - i}:`, blockError.message);
          continue;
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error getting ETH transactions:', error);
      return [];
    }
  }

  // Get token transfer events
  async getTokenTransfers(walletAddress, limit) {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 5000);

      // Get Transfer events where wallet is involved
      const transferEvents = await this.provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        topics: [
          this.transferSignature,
          [
            ethers.utils.hexZeroPad(walletAddress.toLowerCase(), 32),
            null
          ],
          [
            null,
            ethers.utils.hexZeroPad(walletAddress.toLowerCase(), 32)
          ]
        ]
      });

      const tokenTransfers = [];

      for (const log of transferEvents.slice(0, limit)) {
        try {
          const block = await this.provider.getBlock(log.blockNumber);
          const transaction = await this.provider.getTransaction(log.transactionHash);

          // Decode transfer event
          const from = ethers.utils.getAddress('0x' + log.topics[1].slice(26));
          const to = ethers.utils.getAddress('0x' + log.topics[2].slice(26));
          const value = ethers.BigNumber.from(log.data);

          // Get token info
          let tokenInfo;
          try {
            tokenInfo = await tokenService.getTokenInfo(log.address);
          } catch {
            tokenInfo = { symbol: 'UNKNOWN', decimals: 18, name: 'Unknown Token' };
          }

          const formattedValue = ethers.utils.formatUnits(value, tokenInfo.decimals);

          tokenTransfers.push({
            hash: log.transactionHash,
            from,
            to,
            value: formattedValue,
            tokenAddress: log.address,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp,
            type: 'token_transfer',
            asset: tokenInfo.symbol,
            tokenName: tokenInfo.name,
            direction: from.toLowerCase() === walletAddress.toLowerCase() ? 'out' : 'in',
            gasUsed: transaction.gasLimit?.toString() || '0',
            gasPrice: ethers.utils.formatUnits(transaction.gasPrice || '0', 'gwei')
          });
        } catch (eventError) {
          console.log('Error processing transfer event:', eventError.message);
          continue;
        }
      }

      return tokenTransfers;
    } catch (error) {
      console.error('Error getting token transfers:', error);
      return [];
    }
  }

  // Determine transaction type based on context
  determineTransactionType(tx, walletAddress) {
    const to = tx.to?.toLowerCase();
    const from = tx.from?.toLowerCase();
    const wallet = walletAddress.toLowerCase();

    // Check if it's interaction with known contracts
    if (to && this.knownContracts[to]) {
      const contract = this.knownContracts[to];
      return contract.type.toLowerCase();
    }

    // Basic transaction types
    if (from === wallet && to === wallet) return 'self';
    if (from === wallet) return 'send';
    if (to === wallet) return 'receive';
    
    return 'unknown';
  }

  // Enrich transactions with USD values and additional data
  async enrichTransactions(transactions) {
    const enriched = [];

    for (const tx of transactions) {
      try {
        let usdValue = 0;
        
        if (tx.asset === 'ETH') {
          const ethPrice = await tokenService.getTokenPrice('ethereum');
          usdValue = parseFloat(tx.value) * ethPrice;
        } else if (tx.asset && tx.asset !== 'UNKNOWN') {
          const tokenPrice = await tokenService.getTokenPrice(tx.asset.toLowerCase());
          usdValue = parseFloat(tx.value) * tokenPrice;
        }

        enriched.push({
          ...tx,
          usdValue,
          formattedDate: new Date(tx.timestamp * 1000).toISOString(),
          explorerUrl: `https://basescan.org/tx/${tx.hash}`,
          shortHash: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
          gasCostUsd: await this.calculateGasCost(tx)
        });
      } catch (enrichError) {
        console.log('Error enriching transaction:', enrichError.message);
        enriched.push({
          ...tx,
          usdValue: 0,
          formattedDate: new Date(tx.timestamp * 1000).toISOString(),
          explorerUrl: `https://basescan.org/tx/${tx.hash}`,
          shortHash: `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`,
          gasCostUsd: 0
        });
      }
    }

    return enriched;
  }

  // Calculate gas cost in USD
  async calculateGasCost(tx) {
    try {
      const gasUsed = parseFloat(tx.gasUsed || '0');
      const gasPrice = parseFloat(tx.gasPrice || '0');
      const ethPrice = await tokenService.getTokenPrice('ethereum');
      
      const gasCostEth = (gasUsed * gasPrice) / 1e9; // Convert from Gwei
      return gasCostEth * ethPrice;
    } catch {
      return 0;
    }
  }

  // Get transaction statistics
  async getTransactionStats(walletAddress, days = 30) {
    try {
      const transactions = await this.getTransactionHistory(walletAddress, 1000);
      const cutoffTime = Date.now() / 1000 - (days * 24 * 60 * 60);
      
      const recentTxs = transactions.transactions.filter(tx => tx.timestamp > cutoffTime);
      
      const stats = {
        totalTransactions: recentTxs.length,
        totalVolumeUsd: recentTxs.reduce((sum, tx) => sum + (tx.usdValue || 0), 0),
        totalGasCostUsd: recentTxs.reduce((sum, tx) => sum + (tx.gasCostUsd || 0), 0),
        transactionTypes: {},
        dailyActivity: {},
        topAssets: {}
      };

      // Calculate type distribution
      recentTxs.forEach(tx => {
        stats.transactionTypes[tx.type] = (stats.transactionTypes[tx.type] || 0) + 1;
        stats.topAssets[tx.asset] = (stats.topAssets[tx.asset] || 0) + (tx.usdValue || 0);
      });

      return stats;
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      throw new Error('Failed to get transaction statistics');
    }
  }
}

module.exports = new TransactionService();