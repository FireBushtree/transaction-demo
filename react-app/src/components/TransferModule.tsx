import React, { useState } from 'react';
import TransferForm from './TransferForm';

const TransferModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transfer');

  const tabs = [
    { id: 'transfer', name: '转账方式' },
    { id: 'logs', name: '日志方式' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'transfer' && (
            <div className="min-h-96">
              <h3 className="text-lg font-medium text-gray-900 mb-6">转账方式</h3>
              <TransferForm />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="min-h-96">
              <h3 className="text-lg font-medium text-gray-900 mb-4">日志方式</h3>
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <p className="text-gray-500">日志功能内容待实现</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferModule;