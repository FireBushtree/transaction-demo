import React, { useState } from 'react';
import ChainDataTable from './ChainDataTable';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    <div className="w-full p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">链上数据浏览器</CardTitle>
          <CardDescription>
            浏览最新的链上交易、区块信息或查询地址余额
          </CardDescription>
        </CardHeader>
        <CardContent>
        
          {/* Data Type Selector */}
          <div className="mb-6">
            <Label className="mb-3 block">
              选择数据类型
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dataTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleDataTypeChange(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-center space-x-2 ${
                    activeDataType === type.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-border/60 hover:bg-accent/50'
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
              <Label htmlFor="address-search" className="mb-2 block">
                以太坊地址 {getRequiredText()}
              </Label>
              <div className="relative">
                <Input
                  id="address-search"
                  type="text"
                  value={searchAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder={getSearchPlaceholder()}
                  className={`pr-12 font-mono ${
                    addressError 
                      ? 'border-destructive bg-destructive/10' 
                      : isValidAddress 
                        ? 'border-green-500 bg-green-50' 
                        : ''
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
                <p className="mt-1 text-sm text-destructive">{addressError}</p>
              )}
              {isValidAddress && (
                <p className="mt-1 text-sm text-green-600">✓ 地址格式正确</p>
              )}
            </div>
          )}

          {/* Help Text */}
          <Alert className="mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <AlertDescription>
              <p className="font-medium mb-2">使用说明：</p>
              <ul className="space-y-1">
                <li>• <strong>最新交易</strong>: 显示最近的链上交易记录，可选择指定地址查询相关交易</li>
                <li>• <strong>最新区块</strong>: 展示最新产生的区块信息</li>
                <li>• <strong>余额查询</strong>: 查询指定地址的ETH余额（需要输入有效地址）</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Data Table */}
      {(activeDataType !== 'balance' || (activeDataType === 'balance' && isValidAddress)) && (
        <ChainDataTable 
          dataType={activeDataType} 
          searchAddress={isValidAddress ? searchAddress : undefined}
        />
      )}

      {/* Balance requirement message */}
      {activeDataType === 'balance' && !isValidAddress && searchAddress.trim() === '' && (
        <Alert>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <AlertDescription>
            请输入有效的以太坊地址来查询余额
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ChainDataModule;