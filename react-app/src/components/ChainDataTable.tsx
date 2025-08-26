import React, { useState, useEffect } from 'react';
import { chainDataService } from '../services/chainDataService';
import type { TransactionData, BlockData, AccountBalance } from '../services/chainDataService';

type DataType = 'transactions' | 'blocks' | 'balance';

interface ChainDataTableProps {
  dataType: DataType;
  searchAddress?: string;
}

const ChainDataTable: React.FC<ChainDataTableProps> = ({ dataType, searchAddress }) => {
  const [data, setData] = useState<TransactionData[] | BlockData[] | AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      switch (dataType) {
        case 'transactions':
          if (searchAddress) {
            const txData = await chainDataService.searchTransactionsByAddress(searchAddress, 20);
            setData(txData);
          } else {
            const txData = await chainDataService.getLatestTransactions(10);
            setData(txData);
          }
          break;

        case 'blocks':
          const blockData = await chainDataService.getLatestBlocks(10);
          setData(blockData);
          break;

        case 'balance':
          if (searchAddress) {
            const balanceData = await chainDataService.getAccountBalance(searchAddress);
            setData([balanceData]);
          } else {
            setError('查询余额需要提供地址');
          }
          break;

        default:
          setError('不支持的数据类型');
      }
    } catch (err: any) {
      console.error('数据获取失败:', err);
      setError(err.message || '数据获取失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData();
  }, [dataType, searchAddress]);

  const formatAddress = (address: string) => {
    if (!address) {
      return
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  };

  const formatNumber = (num: string | number, decimals: number = 6) => {
    const n = parseFloat(num.toString());
    return isNaN(n) ? '0' : n.toFixed(decimals);
  };

  const renderTransactionTable = (transactions: TransactionData[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              交易哈希
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              区块高度
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              发送方
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              接收方
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              金额 (ETH)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gas价格
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx, index) => (
            <tr key={tx.hash} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600">
                {formatAddress(tx.hash)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {tx.blockNumber.toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                {formatAddress(tx.from)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                {tx.to ? formatAddress(tx.to) : '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(tx.value)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(tx.gasPrice, 2)} Gwei
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  tx.status === 1
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tx.status === 1 ? '成功' : '失败'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBlockTable = (blocks: BlockData[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              区块高度
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              区块哈希
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              时间戳
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              交易数量
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gas使用量
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              矿工
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {blocks.map((block, index) => (
            <tr key={block.hash} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">
                {block.number}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-blue-600">
                {formatAddress(block.hash)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                {formatTimestamp(block.timestamp)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {block.transactions}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {parseInt(block.gasUsed).toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-700">
                {formatAddress(block.miner)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderBalanceTable = (balances: AccountBalance[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              地址
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              余额 (ETH)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              余额 (Wei)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {balances.map((balance, index) => (
            <tr key={balance.address} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                {balance.address}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                {formatNumber(balance.balanceInEth, 6)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                {balance.balance}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const getTableTitle = () => {
    switch (dataType) {
      case 'transactions':
        return searchAddress ? `地址 ${formatAddress(searchAddress)} 的交易记录` : '最新交易';
      case 'blocks':
        return '最新区块';
      case 'balance':
        return '账户余额';
      default:
        return '链上数据';
    }
  };

  const renderTable = () => {
    if (data.length === 0) return null;

    switch (dataType) {
      case 'transactions':
        return renderTransactionTable(data as TransactionData[]);
      case 'blocks':
        return renderBlockTable(data as BlockData[]);
      case 'balance':
        return renderBalanceTable(data as AccountBalance[]);
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{getTableTitle()}</h3>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(loading || refreshing) && (
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
          )}
          刷新数据
        </button>
      </div>

      <div className="p-6">
        {loading && !refreshing ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
            <span className="ml-3 text-gray-600">加载数据中...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-red-600 font-medium">数据加载失败</p>
              <p className="text-gray-500 text-sm mt-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                重试
              </button>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-500">暂无数据</p>
            </div>
          </div>
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
};

export default ChainDataTable;