import React, { useState } from 'react';
import ChainDataTable from './ChainDataTable';
import { ethers } from 'ethers';

type DataType = 'transactions' | 'blocks' | 'balance';

const ChainDataModule: React.FC = () => {
  const [activeDataType, setActiveDataType] = useState<DataType>('transactions');
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [addressError, setAddressError] = useState<string>('');

  const dataTypes = [
    { id: 'transactions' as DataType, name: '最新交易', icon: '🔄' },
    { id: 'blocks' as DataType, name: '最新区块', icon: '⛓️' },
    { id: 'balance' as DataType, name: '余额查询', icon: '💰' }
  ];

  const handleAddressChange = (value: string) => {
    setSearchAddress(value);
    setAddressError('');
    
    const trimmedValue: string = value.trim();
    if (trimmedValue === '') {
      setIsValidAddress(false);
      return;
    }
    
    if (ethers.isAddress(trimmedValue)) {
      setIsValidAddress(true);
    } else {
      setIsValidAddress(false);
      if ((trimmedValue as string).length > 10) {
        setAddressError('地址格式无效');
      }
    }
  };

  const handleDataTypeChange = (dataType: DataType) => {
    setActiveDataType(dataType);
    if (dataType !== 'balance' && dataType !== 'transactions') {
      setSearchAddress('');
      setIsValidAddress(false);
      setAddressError('');
    }
  };

  const getSearchPlaceholder = () => {
    switch (activeDataType) {
      case 'balance':
        return '输入要查询余额的地址...';
      case 'transactions':
        return '输入地址查询相关交易（可选）...';
      default:
        return '';
    }
  };

  const shouldShowAddressInput = () => {
    return activeDataType === 'balance' || activeDataType === 'transactions';
  };

  const getRequiredText = () => {
    return activeDataType === 'balance' ? '（必填）' : '（可选）';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">链上数据浏览器</h2>
        
        {/* Data Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            选择数据类型
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dataTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleDataTypeChange(type.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeDataType === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{type.icon}</span>
                <span className="font-medium">{type.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Address Input */}
        {shouldShowAddressInput() && (
          <div className="mb-6">
            <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 mb-2">
              以太坊地址 {getRequiredText()}
            </label>
            <div className="relative">
              <input
                id="address-search"
                type="text"
                value={searchAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                  addressError 
                    ? 'border-red-300 bg-red-50' 
                    : isValidAddress 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {searchAddress.trim() && (
                  <>
                    {isValidAddress ? (
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </>
                )}
              </div>
            </div>
            {addressError && (
              <p className="mt-1 text-sm text-red-600">{addressError}</p>
            )}
            {isValidAddress && (
              <p className="mt-1 text-sm text-green-600">✓ 地址格式正确</p>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">使用说明：</p>
              <ul className="space-y-1 text-blue-600">
                <li>• <strong>最新交易</strong>: 显示最近的链上交易记录，可选择指定地址查询相关交易</li>
                <li>• <strong>最新区块</strong>: 展示最新产生的区块信息</li>
                <li>• <strong>余额查询</strong>: 查询指定地址的ETH余额（需要输入有效地址）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {(activeDataType !== 'balance' || (activeDataType === 'balance' && isValidAddress)) && (
        <ChainDataTable 
          dataType={activeDataType} 
          searchAddress={isValidAddress ? searchAddress : undefined}
        />
      )}

      {/* Balance requirement message */}
      {activeDataType === 'balance' && !isValidAddress && searchAddress.trim() === '' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-yellow-800 font-medium">请输入有效的以太坊地址来查询余额</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChainDataModule;