// frontend/src/components/Common/WalletInput.tsx
import React, { useState } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';

interface WalletInputProps {
  onWalletSubmit: (address: string) => void;
  currentWallet: string;
}

const WalletInput: React.FC<WalletInputProps> = ({ onWalletSubmit, currentWallet }) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null);

  const validateAddress = async (address: string) => {
    if (!address) {
      setValidationStatus(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/validate/${address}`);
      const data = await response.json();
      setValidationStatus(data.isValid ? 'valid' : 'invalid');
    } catch (error) {
      console.error('Validation error:', error);
      setValidationStatus('invalid');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Basic validation first
    if (value.length === 42 && value.startsWith('0x')) {
      setValidationStatus('valid');
    } else if (value.length > 0) {
      setValidationStatus('invalid');
    } else {
      setValidationStatus(null);
    }
    
    // Then validate with backend after user stops typing (debounce)
    setTimeout(() => {
      if (value === inputValue && value.length === 42 && value.startsWith('0x')) {
        validateAddress(value);
      }
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow submission if address looks valid (42 chars, starts with 0x)
    if (inputValue.length === 42 && inputValue.startsWith('0x')) {
      onWalletSubmit(inputValue);
      setInputValue('');
      setValidationStatus(null);
    }
  };

  const getValidationIcon = () => {
    if (isValidating) return <div className="spinner" />;
    if (validationStatus === 'valid') return <CheckCircle className="validation-icon valid" />;
    if (validationStatus === 'invalid') return <XCircle className="validation-icon invalid" />;
    return null;
  };

  return (
    <div className="wallet-input-container">
      <form onSubmit={handleSubmit} className="wallet-form">
        <div className="input-group">
          <Search className="search-icon" />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter Base wallet address (0x...)"
            className={`wallet-input ${validationStatus || ''}`}
          />
          {getValidationIcon()}
        </div>
        <button 
          type="submit" 
          disabled={!(inputValue.length === 42 && inputValue.startsWith('0x'))}
          className="track-button"
        >
          Track Wallet
        </button>
      </form>
      
      {currentWallet && (
        <div className="current-wallet">
          <span className="current-label">Tracking:</span>
          <span className="current-address">{currentWallet}</span>
          <button 
            onClick={() => onWalletSubmit('')}
            className="clear-button"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletInput;