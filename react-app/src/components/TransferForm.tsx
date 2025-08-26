import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

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

  const getButtonVariant = (): "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" => {
    switch (txStatus) {
      case 'confirmed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 接收方地址 */}
        <div className="space-y-2">
          <Label htmlFor="recipient">
            接收方地址 *
          </Label>
          <Input
            id="recipient"
            type="text"
            value={formData.recipientAddress}
            onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
            placeholder="0x..."
            disabled={txStatus !== 'idle'}
          />
        </div>

        {/* 转账金额 */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            转账金额 (ETH) *
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.000001"
            min="0"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.1"
            disabled={txStatus !== 'idle'}
          />
        </div>

        {/* Input Data */}
        <div className="space-y-2">
          <Label htmlFor="inputData">
            Input Data
          </Label>
          <Textarea
            id="inputData"
            value={formData.inputData}
            onChange={(e) => handleInputChange('inputData', e.target.value)}
            placeholder="0x... (可选)"
            rows={3}
            disabled={txStatus !== 'idle'}
            className="resize-none"
          />
        </div>

        {/* 交易状态 */}
        {txStatus !== 'idle' && (
          <Alert variant={txStatus === 'failed' ? 'destructive' : 'default'}>
            <div className="flex items-center space-x-2">
              {(txStatus === 'preparing' || txStatus === 'pending') && (
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
              )}
              {txStatus === 'confirmed' && (
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {txStatus === 'failed' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">
                {getStatusText()}
              </span>
            </div>
            <AlertDescription>
              {txHash && (
                <div className="mt-2">
                  <p className="text-xs">交易哈希:</p>
                  <code className="text-xs break-all bg-muted px-2 py-1 rounded mt-1 block">
                    {txHash}
                  </code>
                </div>
              )}
              {error && (
                <p className="mt-2">{error}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 提交按钮 */}
        <Button
          type="submit"
          disabled={!isFormValid}
          variant={getButtonVariant()}
          className="w-full"
          size="lg"
        >
          {(txStatus === 'preparing' || txStatus === 'pending') && (
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
          )}
          {getStatusText()}
        </Button>
      </form>
    </div>
  );
};

export default TransferForm;