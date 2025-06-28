// backend/src/services/tokenService.js
const axios = require('axios');
const baseChain = require('./baseChain');

class TokenService {
  constructor() {
    // Common Base chain tokens
    this.commonTokens = [
      {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      },
      {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        name: 'Wrapped Ether',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
      },
      {
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        logoURI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
      },
      {
        address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
        symbol: 'USDbC',
        name: 'USD Base Coin',
        decimals: 6,
        logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
      }
    ];
  }

  // Get all token balances for a wallet
  async getWalletTokens(walletAddress) {
    try {
      const tokens = [];
      
      // Get ETH balance
      const ethBalance = await baseChain.getETHBalance(walletAddress);
      const ethPrice = await this.getTokenPrice('ethereum');
      
      tokens.push({
        symbol: 'ETH',
        name: 'Ethereum',
        balance: parseFloat(ethBalance),
        decimals: 18,
        address: 'native',
        price: ethPrice,
        value: parseFloat(ethBalance) * ethPrice,
        logoURI: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
      });

      // Check balances for common tokens
      for (const token of this.commonTokens) {
        try {
          const tokenData = await baseChain.getTokenBalance(walletAddress, token.address, token.decimals);
          const balance = parseFloat(tokenData.balance);
          
          if (balance > 0) {
            const price = await this.getTokenPrice(token.symbol.toLowerCase());
            
            tokens.push({
              ...token,
              balance,
              price,
              value: balance * price,
              actualSymbol: tokenData.symbol,
              actualName: tokenData.name
            });
          }
        } catch (error) {
          console.log(`Error getting balance for ${token.symbol}:`, error.message);
          // Continue with other tokens
        }
      }

      // Calculate total portfolio value
      const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0);
      
      // Add percentage allocation
      const tokensWithPercentage = tokens.map(token => ({
        ...token,
        percentage: totalValue > 0 ? ((token.value || 0) / totalValue) * 100 : 0
      }));

      return {
        tokens: tokensWithPercentage,
        totalValue,
        tokenCount: tokens.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting wallet tokens:', error);
      throw new Error('Failed to get wallet tokens');
    }
  }

  // Get token price from CoinGecko
  async getTokenPrice(tokenId) {
    try {
      // Map some symbols to CoinGecko IDs
      const symbolToId = {
        'eth': 'ethereum',
        'ethereum': 'ethereum',
        'usdc': 'usd-coin',
        'weth': 'weth',
        'dai': 'dai',
        'usdbc': 'usd-coin' // Treat USDbC as USDC for pricing
      };

      const geckoId = symbolToId[tokenId.toLowerCase()] || tokenId.toLowerCase();
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
        { timeout: 5000 }
      );

      return response.data[geckoId]?.usd || 0;
    } catch (error) {
      console.error(`Error getting price for ${tokenId}:`, error.message);
      return 0; // Return 0 if price fetch fails
    }
  }

  // Get token info by address
  async getTokenInfo(tokenAddress) {
    try {
      // Check if it's a known token first
      const knownToken = this.commonTokens.find(
        token => token.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (knownToken) {
        const price = await this.getTokenPrice(knownToken.symbol.toLowerCase());
        return { ...knownToken, price };
      }

      // If not known, get from contract
      const contractInfo = await baseChain.getTokenInfo(tokenAddress);
      const price = await this.getTokenPrice(contractInfo.symbol.toLowerCase());

      return {
        ...contractInfo,
        price,
        logoURI: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${tokenAddress}/logo.png`
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw new Error('Failed to get token information');
    }
  }

  // Add a custom token to track
  addCustomToken(tokenInfo) {
    const exists = this.commonTokens.find(
      token => token.address.toLowerCase() === tokenInfo.address.toLowerCase()
    );

    if (!exists) {
      this.commonTokens.push(tokenInfo);
      return true;
    }
    return false;
  }

  // Get portfolio breakdown for charts
  getPortfolioBreakdown(tokens) {
    return tokens
      .filter(token => token.value > 0)
      .sort((a, b) => b.value - a.value)
      .map(token => ({
        name: token.symbol,
        value: token.value,
        percentage: token.percentage,
        color: this.getTokenColor(token.symbol)
      }));
  }

  // Generate colors for portfolio chart
  getTokenColor(symbol) {
    const colors = {
      'ETH': '#627eea',
      'USDC': '#2775ca',
      'WETH': '#627eea',
      'DAI': '#f4b731',
      'USDbC': '#2775ca'
    };
    
    return colors[symbol] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
  }
}

module.exports = new TokenService();