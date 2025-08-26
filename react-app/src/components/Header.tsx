import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface NFT {
  tokenId: string;
  image?: string;
  name?: string;
}

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

interface WalletInfo {
  address: string;
  ensName?: string;
  avatar?: string;
  nfts: NFT[];
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
    rpcUrl: 'http://localhost:8545',
    symbol: 'ETH',
    explorer: undefined
  }
];

const WALLET_PROVIDERS: WalletProvider[] = [
  {
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
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    checkAvailability: () => true,
    connect: async () => {
      throw new Error('WalletConnect 集成待实现');
    }
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '💙',
    checkAvailability: () => !!(window as any).ethereum?.isCoinbaseWallet,
    connect: async () => {
      if (!(window as any).ethereum?.isCoinbaseWallet) {
        throw new Error('Coinbase Wallet 未安装');
      }
      return (window as any).ethereum;
    }
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    checkAvailability: () => !!(window as any).solana?.isPhantom,
    connect: async () => {
      if (!(window as any).solana?.isPhantom) {
        throw new Error('Phantom 钱包未安装');
      }
      throw new Error('Phantom 是 Solana 钱包，请选择以太坊钱包');
    }
  }
];

const Header: React.FC = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showNFTs, setShowNFTs] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(NETWORKS[0]);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [selectedWalletProvider, setSelectedWalletProvider] = useState<WalletProvider>(WALLET_PROVIDERS[0]);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

  const handleWalletProviderChange = (provider: WalletProvider) => {
    setSelectedWalletProvider(provider);
    setShowWalletDropdown(false);
  };

  const connectWallet = async () => {
    if (!selectedWalletProvider.checkAvailability()) {
      alert(`${selectedWalletProvider.name} 钱包未安装或不可用！`);
      return;
    }

    setIsConnecting(true);
    try {
      const walletInstance = await selectedWalletProvider.connect();
      const provider = new ethers.BrowserProvider(walletInstance);
      
      try {
        await walletInstance.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${selectedNetwork.chainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await walletInstance.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${selectedNetwork.chainId.toString(16)}`,
              chainName: selectedNetwork.name,
              rpcUrls: [selectedNetwork.rpcUrl],
              nativeCurrency: {
                name: selectedNetwork.symbol,
                symbol: selectedNetwork.symbol,
                decimals: 18,
              },
              blockExplorerUrls: selectedNetwork.explorer ? [selectedNetwork.explorer] : null,
            }],
          });
        }
      }
      
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const walletInfo: WalletInfo = {
        address,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        nfts: [],
        network: selectedNetwork,
        provider: selectedWalletProvider
      };

      await Promise.all([
        fetchENS(address, walletInfo, provider),
        fetchNFTs(address, walletInfo)
      ]);
      setWallet(walletInfo);
    } catch (error: any) {
      console.error('连接钱包失败:', error);
      alert(error.message || `连接 ${selectedWalletProvider.name} 失败`);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchENS = async (address: string, walletInfo: WalletInfo, provider: ethers.BrowserProvider) => {
    try {
      const ensName = await provider.lookupAddress(address);
      if (ensName) {
        walletInfo.ensName = ensName;
        const ensAvatar = await provider.getAvatar(ensName);
        if (ensAvatar) {
          walletInfo.avatar = ensAvatar;
        }
      }
    } catch (error) {
      console.log('获取 ENS 失败:', error);
    }
  };

  const fetchNFTs = async (address: string, walletInfo: WalletInfo) => {
    try {
      const response = await fetch(
        `https://api.opensea.io/api/v1/assets?owner=${address}&limit=10`,
        {
          headers: {
            'X-API-KEY': process.env.OPENSEA_API_KEY || ''
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        walletInfo.nfts = data.assets?.map((asset: any) => ({
          tokenId: asset.token_id,
          image: asset.image_url,
          name: asset.name || `#${asset.token_id}`
        })) || [];
      }
    } catch (error) {
      console.log('获取 NFT 失败:', error);
    }
  };

  const handleNetworkChange = async (network: Network) => {
    setSelectedNetwork(network);
    setShowNetworkDropdown(false);
    
    if (wallet && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${network.chainId.toString(16)}` }],
        });
        
        const updatedWallet = { ...wallet, network };
        setWallet(updatedWallet);
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
            
            const updatedWallet = { ...wallet, network };
            setWallet(updatedWallet);
          } catch (addError) {
            console.error('添加网络失败:', addError);
            alert(`添加 ${network.name} 失败`);
          }
        } else {
          console.error('切换网络失败:', error);
          alert(`切换到 ${network.name} 失败`);
        }
      }
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setShowNFTs(false);
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
          const address = accounts[0];
          
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const currentChainId = parseInt(chainId, 16);
            const currentNetwork = NETWORKS.find(n => n.chainId === currentChainId) || NETWORKS[0];
            setSelectedNetwork(currentNetwork);
            
            const walletInfo: WalletInfo = {
              address,
              avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
              nfts: [],
              network: currentNetwork,
              provider: selectedWalletProvider
            };
            await Promise.all([
              fetchENS(address, walletInfo, provider),
              fetchNFTs(address, walletInfo)
            ]);
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Web3 App</h1>
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
                <span className="text-sm font-medium text-gray-700">
                  {selectedNetwork.name}
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
                      className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                        selectedNetwork.id === network.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${
                        network.id === 'ethereum' ? 'bg-blue-500' :
                        network.id === 'sepolia' ? 'bg-purple-500' : 
                        'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-medium">{network.name}</span>
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
                    onClick={() => setShowNFTs(!showNFTs)}
                  >
                    <div className="relative">
                      <img
                        src={wallet.avatar}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 border border-gray-200">
                        {wallet.provider.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">
                        {wallet.ensName || formatAddress(wallet.address)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {wallet.provider.name}
                      </span>
                    </div>
                    {wallet.nfts.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {wallet.nfts.length} NFT{wallet.nfts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    断开
                  </button>
                </div>

                {showNFTs && wallet.nfts.length > 0 && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">我的 NFTs</h3>
                      <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                        {wallet.nfts.map((nft, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                              {nft.image ? (
                                <img
                                  src={nft.image}
                                  alt={nft.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  NFT
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                              {nft.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  disabled={isConnecting}
                >
                  <span className="text-lg">{selectedWalletProvider.icon}</span>
                  <span className="text-sm font-medium">
                    {isConnecting ? '连接中...' : `连接 ${selectedWalletProvider.name}`}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showWalletDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    {WALLET_PROVIDERS.map((provider) => {
                      const isAvailable = provider.checkAvailability();
                      return (
                        <button
                          key={provider.id}
                          onClick={() => handleWalletProviderChange(provider)}
                          disabled={!isAvailable}
                          className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                            selectedWalletProvider.id === provider.id ? 'bg-blue-50 text-blue-700' : 
                            !isAvailable ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{provider.icon}</span>
                            <span className="text-sm font-medium">{provider.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!isAvailable && (
                              <span className="text-xs text-red-500">未安装</span>
                            )}
                            {selectedWalletProvider.id === provider.id && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    <div className="border-t border-gray-200 pt-2">
                      <button
                        onClick={connectWallet}
                        disabled={isConnecting || !selectedWalletProvider.checkAvailability()}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-b-lg text-sm font-medium transition-colors"
                      >
                        {isConnecting ? '连接中...' : '连接钱包'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;