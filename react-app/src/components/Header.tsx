import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface Network {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  explorer?: string;
}

interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  checkAvailability: () => boolean;
  connect: () => Promise<any>;
}

interface WalletAddress {
  address: string;
  ensName?: string;
  avatar?: string;
}

interface WalletInfo {
  currentAddress: string;
  addresses: WalletAddress[];
  network: Network;
  provider: WalletProvider;
}

const NETWORKS: Network[] = [
  {
    id: 'ethereum',
    name: '以太坊主网',
    chainId: 1,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    symbol: 'ETH',
    explorer: 'https://etherscan.io'
  },
  {
    id: 'sepolia',
    name: 'Sepolia 测试网',
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    symbol: 'SepoliaETH',
    explorer: 'https://sepolia.etherscan.io'
  },
  {
    id: 'localhost',
    name: '本地链',
    chainId: 1337,
    rpcUrl: 'http://localhost:7545',
    symbol: 'ETH',
    explorer: undefined
  }
];

const METAMASK_PROVIDER: WalletProvider = {
  id: 'metamask',
  name: 'MetaMask',
  icon: '🦊',
  checkAvailability: () => !!(window as any).ethereum?.isMetaMask,
  connect: async () => {
    if (!(window as any).ethereum?.isMetaMask) {
      throw new Error('MetaMask 未安装');
    }
    return (window as any).ethereum;
  }
};

const Header: React.FC = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingENS, setIsLoadingENS] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);


  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask!');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const currentAddress = accounts[0];

      setIsLoadingENS(true);
      const addresses: WalletAddress[] = await Promise.all(
        accounts.map(async (addr: string) => {
          const addressInfo: WalletAddress = {
            address: addr,
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${addr}`
          };

          await fetchENSForAddress(addr, addressInfo, provider);

          return addressInfo;
        })
      );
      setIsLoadingENS(false);

      const walletInfo: WalletInfo = {
        currentAddress,
        addresses,
        network: selectedNetwork,
        provider: METAMASK_PROVIDER
      };

      setWallet(walletInfo);
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      alert(error.message || '连接钱包失败');
    } finally {
      setIsConnecting(false);
    }
  };

  const updateWalletWithNewNetwork = async (wallet: WalletInfo, network: Network) => {
    setIsLoadingENS(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const updatedAddresses = await Promise.all(
        wallet.addresses.map(async (addr) => {
          const addressInfo = { ...addr };
          // 重置 ENS 信息
          addressInfo.ensName = undefined;
          addressInfo.avatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${addr.address}`;

          // 重新获取 ENS 信息
          await fetchENSForAddress(addr.address, addressInfo, provider);
          return addressInfo;
        })
      );

      const updatedWallet = {
        ...wallet,
        network,
        addresses: updatedAddresses
      };
      setWallet(updatedWallet);
    } finally {
      setIsLoadingENS(false);
    }
  };

  const fetchENSForAddress = async (address: string, addressInfo: WalletAddress, provider: ethers.BrowserProvider) => {
    try {
      const ensName = await provider.lookupAddress(address);
      if (ensName) {
        addressInfo.ensName = ensName;
        const ensAvatar = await provider.getAvatar(ensName);
        if (ensAvatar) {
          addressInfo.avatar = ensAvatar;
        }
      }
    } catch (error) {
      console.log('获取 ENS 失败:', error);
    }
  };


  const handleNetworkChange = async (network: Network) => {
    setSelectedNetwork(network);
    setShowNetworkDropdown(false);

    if (wallet && window.ethereum) {
      setIsSwitchingNetwork(true);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });

        // 网络切换成功后，重新获取所有地址的 ENS 信息
        await updateWalletWithNewNetwork(wallet, network);
      } catch (error: any) {
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpcUrl],
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                blockExplorerUrls: network.explorer ? [network.explorer] : null,
              }],
            });

            // 网络添加成功后，重新获取所有地址的 ENS 信息
            await updateWalletWithNewNetwork(wallet, network);
          } catch (addError) {
            console.error('添加网络失败:', addError);
            alert(`添加 ${network.name} 失败`);
          }
        } else {
          console.error('切换网络失败:', error);
          alert(`切换到 ${network.name} 失败`);
        }
      } finally {
        setIsSwitchingNetwork(false);
      }
    }
  };

  const handleAddressChange = (newAddress: string) => {
    if (wallet) {
      setWallet({
        ...wallet,
        currentAddress: newAddress
      });
    }
    setShowAddressDropdown(false);
  };

  const disconnectWallet = () => {
    setWallet(null);
    setShowAddressDropdown(false);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const currentAddress = accounts[0];

          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            const currentNetwork = NETWORKS.find(n => n.chainId === currentChainId) || NETWORKS[0];
            setSelectedNetwork(currentNetwork);

            setIsLoadingENS(true);
            const addresses: WalletAddress[] = await Promise.all(
              accounts.map(async (addr: string) => {
                const addressInfo: WalletAddress = {
                  address: addr,
                  avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${addr}`,
                      };

                await fetchENSForAddress(addr, addressInfo, provider);

                return addressInfo;
              })
            );
            setIsLoadingENS(false);

            const walletInfo: WalletInfo = {
              currentAddress,
              addresses,
              network: currentNetwork,
              provider: METAMASK_PROVIDER
            };
            setWallet(walletInfo);
          } catch (error) {
            console.error('获取当前网络失败:', error);
          }
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <header className="bg-card shadow-sm border-b border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-foreground">Web3 App</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${
                  selectedNetwork.id === 'ethereum' ? 'bg-blue-500' :
                  selectedNetwork.id === 'sepolia' ? 'bg-purple-500' :
                  'bg-gray-500'
                }`}></div>
                <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <span>{selectedNetwork.name}</span>
                  {(isLoadingENS || isSwitchingNetwork) && (
                    <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                  )}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNetworkDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  {NETWORKS.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleNetworkChange(network)}
                      disabled={isSwitchingNetwork}
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedNetwork.id === network.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${
                        network.id === 'ethereum' ? 'bg-blue-500' :
                        network.id === 'sepolia' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium flex items-center space-x-2">
                        <span>{network.name}</span>
                        {isSwitchingNetwork && selectedNetwork.id === network.id && (
                          <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                        )}
                      </span>
                      {selectedNetwork.id === network.id && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {wallet ? (
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                    onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  >
                    <div className="relative">
                      <img
                        src={wallet.addresses.find(addr => addr.address === wallet.currentAddress)?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${wallet.currentAddress}`}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 border border-gray-200">
                        {wallet.provider.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                          <span>
                            {wallet.addresses.find(addr => addr.address === wallet.currentAddress)?.ensName || formatAddress(wallet.currentAddress)}
                          </span>
                          {isLoadingENS && (
                            <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                          )}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500">
                        {wallet.provider.name}
                      </span>
                    </div>
                  </div>

                  {showAddressDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-15">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {wallet.addresses.length > 1 ? '切换账户' : '账户信息'}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {wallet.addresses.length} 个地址
                          </span>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {wallet.addresses.map((addr, index) => (
                            <button
                              key={addr.address}
                              onClick={() => handleAddressChange(addr.address)}
                              disabled={wallet.addresses.length === 1}
                              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                wallet.currentAddress === addr.address
                                  ? 'bg-blue-50 border border-blue-200'
                                  : wallet.addresses.length > 1
                                    ? 'hover:bg-gray-50 border border-transparent'
                                    : 'border border-transparent cursor-default'
                              }`}
                            >
                              <img
                                src={addr.avatar}
                                alt="Avatar"
                                className="w-6 h-6 rounded-full"
                              />
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                                  <span>{addr.ensName || formatAddress(addr.address)}</span>
                                  {isLoadingENS && (
                                    <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  <span>账户 {index + 1}</span>
                                </div>
                              </div>
                              {wallet.currentAddress === addr.address && (
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                        {wallet.addresses.length === 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 text-center">
                              只有一个地址，无需切换
                            </p>
                          </div>
                        )}
                        {wallet.addresses.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 text-center">
                              点击选择不同的钱包地址
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={disconnectWallet}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    断开
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnecting ? '连接中...' : '连接钱包'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;