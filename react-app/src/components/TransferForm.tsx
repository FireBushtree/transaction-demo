import React, { useState } from 'react';
import { ethers } from 'ethers';

interface TransferFormData {
  recipientAddress: string;
  amount: string;
  inputData: string;
}

type TransactionStatus = 'idle' | 'preparing' | 'pending' | 'confirmed' | 'failed';

const TransferForm: React.FC = () => {
  const [formData, setFormData] = useState<TransferFormData>({
    recipientAddress: '',
    amount: '',
    inputData: ''
  });
  
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleInputChange = (field: keyof TransferFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.recipientAddress || !formData.amount) {
      alert('请填写接收方地址和转账金额');
      return;
    }

    if (!window.ethereum) {
      alert('请安装 MetaMask!');
      return;
    }

    setError('');
    setTxHash('');
    setTxStatus('preparing');

    try {
      // 检查钱包连接
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);
      
      if (accounts.length === 0) {
        alert('请先连接钱包');
        setTxStatus('idle');
        return;
      }

      // 验证地址格式
      if (!ethers.isAddress(formData.recipientAddress)) {
        throw new Error('接收方地址格式无效');
      }

      // 获取 signer
      const signer = await provider.getSigner();
      
      // 构建交易参数
      const txParams: any = {
        to: formData.recipientAddress,
        value: ethers.parseEther(formData.amount)
      };

      // 如果有 input data，添加到交易中
      if (formData.inputData.trim()) {
        if (!formData.inputData.startsWith('0x')) {
          throw new Error('Input Data 必须以 0x 开头');
        }
        txParams.data = formData.inputData;
      }

      // 发送交易
      setTxStatus('pending');
      const tx = await signer.sendTransaction(txParams);
      setTxHash(tx.hash);

      // 等待交易确认
      setTxStatus('confirmed');
      await tx.wait();
      
      alert(`转账成功！\n交易哈希: ${tx.hash}`);
      
      // 重置表单
      setFormData({
        recipientAddress: '',
        amount: '',
        inputData: ''
      });
      
    } catch (err: any) {
      console.error('转账失败:', err);
      setTxStatus('failed');
      
      let errorMessage = '转账失败';
      if (err.code === 4001) {
        errorMessage = '用户取消了交易';
      } else if (err.code === -32603) {
        errorMessage = '余额不足或网络错误';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      if (txStatus !== 'confirmed') {
        setTimeout(() => setTxStatus('idle'), 3000);
      }
    }
  };

  const isFormValid = formData.recipientAddress.trim() !== '' && 
                     formData.amount.trim() !== '' && 
                     txStatus === 'idle';

  const getStatusText = () => {
    switch (txStatus) {
      case 'preparing':
        return '准备交易中...';
      case 'pending':
        return '等待用户确认...';
      case 'confirmed':
        return '交易已确认';
      case 'failed':
        return '交易失败';
      default:
        return '提交转账';
    }
  };

  const getStatusColor = () => {
    switch (txStatus) {
      case 'confirmed':
        return 'bg-green-600 hover:bg-green-700';
      case 'failed':
        return 'bg-red-600 hover:bg-red-700';
      case 'preparing':
      case 'pending':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 接收方地址 */}
        <div>
          <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-2">
            接收方地址 *
          </label>
          <input
            id="recipient"
            type="text"
            value={formData.recipientAddress}
            onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
            placeholder="0x..."
            disabled={txStatus !== 'idle'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* 转账金额 */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
            转账金额 (ETH) *
          </label>
          <input
            id="amount"
            type="number"
            step="0.000001"
            min="0"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.1"
            disabled={txStatus !== 'idle'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* Input Data */}
        <div>
          <label htmlFor="inputData" className="block text-sm font-medium text-gray-700 mb-2">
            Input Data
          </label>
          <textarea
            id="inputData"
            value={formData.inputData}
            onChange={(e) => handleInputChange('inputData', e.target.value)}
            placeholder="0x... (可选)"
            rows={3}
            disabled={txStatus !== 'idle'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm resize-none"
          />
        </div>

        {/* 交易状态 */}
        {txStatus !== 'idle' && (
          <div className="space-y-3">
            <div className={`p-3 rounded-lg ${
              txStatus === 'confirmed' ? 'bg-green-50 border border-green-200' :
              txStatus === 'failed' ? 'bg-red-50 border border-red-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2">
                {(txStatus === 'preparing' || txStatus === 'pending') && (
                  <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                )}
                {txStatus === 'confirmed' && (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {txStatus === 'failed' && (
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={`text-sm font-medium ${
                  txStatus === 'confirmed' ? 'text-green-800' :
                  txStatus === 'failed' ? 'text-red-800' :
                  'text-yellow-800'
                }`}>
                  {getStatusText()}
                </span>
              </div>
              {txHash && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600">交易哈希:</p>
                  <code className="text-xs break-all bg-gray-100 px-2 py-1 rounded mt-1 block">
                    {txHash}
                  </code>
                </div>
              )}
              {error && (
                <p className="text-sm text-red-600 mt-2">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
            isFormValid ? getStatusColor() : ''
          }`}
        >
          {getStatusText()}
        </button>
      </form>
    </div>
  );
};

export default TransferForm;