// backend/src/routes/wallet.js
const express = require('express');
const router = express.Router();
const baseChain = require('../services/baseChain');
const tokenService = require('../services/tokenService');

// Get wallet overview (ETH balance + basic info)
router.get('/overview/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking address:', address); // Debug log
    
    if (!baseChain.isValidAddress(address)) {
      console.log('Invalid address format'); // Debug log
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log('Address is valid, fetching data...'); // Debug log
    const ethBalance = await baseChain.getETHBalance(address);
    const gasPrice = await baseChain.getGasPrice();

    res.json({
      address,
      ethBalance: parseFloat(ethBalance),
      gasPrice: parseFloat(gasPrice),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Wallet overview error:', error);
    res.status(500).json({ 
      error: 'Failed to get wallet overview',
      details: error.message 
    });
  }
});

// Get complete portfolio with all tokens
router.get('/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!baseChain.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const portfolio = await tokenService.getWalletTokens(address);
    
    res.json({
      address,
      ...portfolio
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ 
      error: 'Failed to get portfolio data',
      details: error.message 
    });
  }
});

// Get token balance for specific token
router.get('/token/:address/:tokenAddress', async (req, res) => {
  try {
    const { address, tokenAddress } = req.params;
    
    if (!baseChain.isValidAddress(address) || !baseChain.isValidAddress(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const tokenBalance = await baseChain.getTokenBalance(address, tokenAddress);
    
    res.json({
      walletAddress: address,
      tokenAddress,
      ...tokenBalance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token balance error:', error);
    res.status(500).json({ error: 'Failed to get token balance' });
  }
});

// Get transaction history
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!baseChain.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const transactions = await baseChain.getTransactionHistory(address);
    
    res.json({
      address,
      transactions,
      count: transactions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Get token information
router.get('/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    
    if (!baseChain.isValidAddress(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid token address' });
    }

    const tokenInfo = await tokenService.getTokenInfo(tokenAddress);
    
    res.json({
      ...tokenInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ error: 'Failed to get token information' });
  }
});

// Validate wallet address
router.get('/validate/:address', (req, res) => {
  const { address } = req.params;
  const isValid = baseChain.isValidAddress(address);
  
  res.json({
    address,
    isValid,
    timestamp: new Date().toISOString()
  });
});

// Debug route to test validation
router.get('/debug/:address', (req, res) => {
  const { address } = req.params;
  
  console.log('=== DEBUG INFO ===');
  console.log('Raw address:', address);
  console.log('Address length:', address.length);
  console.log('Starts with 0x:', address.startsWith('0x'));
  console.log('Trimmed address:', address.trim());
  
  try {
    // Test ethers validation directly
    const ethersValid = require('ethers').utils.isAddress(address);
    console.log('Ethers isAddress result:', ethersValid);
    
    // Test our custom validation
    const customValid = baseChain.isValidAddress(address);
    console.log('Custom validation result:', customValid);
    
    res.json({
      address,
      length: address.length,
      startsWithHex: address.startsWith('0x'),
      ethersValid,
      customValid,
      details: {
        raw: address,
        trimmed: address.trim()
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.json({
      error: error.message,
      address
    });
  }
});

module.exports = router;

// Get wallet overview (ETH balance + basic info)
router.get('/overview/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('Checking address:', address); // Debug log
    
    if (!baseChain.isValidAddress(address)) {
      console.log('Invalid address format'); // Debug log
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    console.log('Address is valid, fetching data...'); // Debug log
    const ethBalance = await baseChain.getETHBalance(address);
    const gasPrice = await baseChain.getGasPrice();

    res.json({
      address,
      ethBalance: parseFloat(ethBalance),
      gasPrice: parseFloat(gasPrice),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Wallet overview error:', error);
    res.status(500).json({ 
      error: 'Failed to get wallet overview',
      details: error.message 
    });
  }
});

// Get token balance for specific token
router.get('/token/:address/:tokenAddress', async (req, res) => {
  try {
    const { address, tokenAddress } = req.params;
    
    if (!baseChain.isValidAddress(address) || !baseChain.isValidAddress(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const tokenBalance = await baseChain.getTokenBalance(address, tokenAddress);
    
    res.json({
      walletAddress: address,
      tokenAddress,
      ...tokenBalance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token balance error:', error);
    res.status(500).json({ error: 'Failed to get token balance' });
  }
});

// Get transaction history
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!baseChain.isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const transactions = await baseChain.getTransactionHistory(address);
    
    res.json({
      address,
      transactions,
      count: transactions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// Get token information
router.get('/token-info/:tokenAddress', async (req, res) => {
  try {
    const { tokenAddress } = req.params;
    
    if (!baseChain.isValidAddress(tokenAddress)) {
      return res.status(400).json({ error: 'Invalid token address' });
    }

    const tokenInfo = await baseChain.getTokenInfo(tokenAddress);
    
    res.json({
      ...tokenInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ error: 'Failed to get token information' });
  }
});

// Validate wallet address
router.get('/validate/:address', (req, res) => {
  const { address } = req.params;
  const isValid = baseChain.isValidAddress(address);
  
  res.json({
    address,
    isValid,
    timestamp: new Date().toISOString()
  });
});

// Debug route to test validation
router.get('/debug/:address', (req, res) => {
  const { address } = req.params;
  
  console.log('=== DEBUG INFO ===');
  console.log('Raw address:', address);
  console.log('Address length:', address.length);
  console.log('Starts with 0x:', address.startsWith('0x'));
  console.log('Trimmed address:', address.trim());
  
  try {
    // Test ethers validation directly
    const ethersValid = require('ethers').utils.isAddress(address);
    console.log('Ethers isAddress result:', ethersValid);
    
    // Test our custom validation
    const customValid = baseChain.isValidAddress(address);
    console.log('Custom validation result:', customValid);
    
    res.json({
      address,
      length: address.length,
      startsWithHex: address.startsWith('0x'),
      ethersValid,
      customValid,
      details: {
        raw: address,
        trimmed: address.trim()
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.json({
      error: error.message,
      address
    });
  }
});

module.exports = router;