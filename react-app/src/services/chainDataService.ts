import { ethers } from "ethers";

export interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gasUsed: string;
  timestamp: number;
  status: number;
}

export interface BlockData {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
}

export interface AccountBalance {
  address: string;
  balance: string;
  balanceInEth: string;
}

export class ChainDataService {
  private provider: ethers.Provider | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
    }
  }

  async getLatestTransactions(count: number = 10): Promise<TransactionData[]> {
    if (!this.provider) throw new Error("Provider not initialized");

    try {
      const latestBlock = await this.provider.getBlock("latest", true);
      if (!latestBlock || !latestBlock.transactions) return [];

      const transactions: TransactionData[] = [];
      const txHashes = latestBlock.transactions.slice(0, count);

      for (const txHash of txHashes) {
        if (typeof txHash === "string") {
          const tx = await this.provider.getTransaction(txHash);
          const receipt = await this.provider.getTransactionReceipt(txHash);

          if (tx && receipt) {
            transactions.push({
              hash: tx.hash,
              blockNumber: tx.blockNumber || 0,
              from: tx.from,
              to: tx.to || null,
              value: ethers.formatEther(tx.value),
              gasPrice: ethers.formatUnits(tx.gasPrice || 0, "gwei"),
              gasUsed: receipt.gasUsed.toString(),
              timestamp: latestBlock.timestamp,
              status: receipt.status || 0,
            });
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  }

  async getLatestBlocks(count: number = 10): Promise<BlockData[]> {
    if (!this.provider) throw new Error("Provider not initialized");

    try {
      const latestBlockNumber = await this.provider.getBlockNumber();
      const blocks: BlockData[] = [];

      for (let i = 0; i < count; i++) {
        const blockNumber = latestBlockNumber - i;
        const block = await this.provider.getBlock(blockNumber);

        if (block) {
          blocks.push({
            number: block.number,
            hash: block.hash || "",
            timestamp: block.timestamp,
            transactions: block.transactions.length,
            gasUsed: block.gasUsed.toString(),
            gasLimit: block.gasLimit.toString(),
            miner: block.miner,
          });
        }
      }

      return blocks;
    } catch (error) {
      console.error("Error fetching blocks:", error);
      throw error;
    }
  }

  async getAccountBalance(address: string): Promise<AccountBalance> {
    if (!this.provider) throw new Error("Provider not initialized");

    try {
      const balance = await this.provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);

      return {
        address,
        balance: balance.toString(),
        balanceInEth,
      };
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }

  async searchTransactionsByAddress(
    address: string,
    limit: number = 20
  ): Promise<TransactionData[]> {
    if (!this.provider) throw new Error("Provider not initialized");

    try {
      const latestBlockNumber = await this.provider.getBlockNumber();
      const transactions: TransactionData[] = [];
      const maxBlocksToSearch = 100;

      for (
        let i = 0;
        i < maxBlocksToSearch && transactions.length < limit;
        i++
      ) {
        const blockNumber = latestBlockNumber - i;
        const block = await this.provider.getBlock(blockNumber, true);

        if (!block || !block.transactions) continue;

        for (const txHash of block.transactions) {
          if (typeof txHash === "string") {
            const tx = await this.provider.getTransaction(txHash);

            if (
              tx &&
              (tx.from.toLowerCase() === address.toLowerCase() ||
                (tx.to && tx.to.toLowerCase() === address.toLowerCase()))
            ) {
              const receipt = await this.provider.getTransactionReceipt(txHash);

              if (receipt) {
                transactions.push({
                  hash: tx.hash,
                  blockNumber: tx.blockNumber || 0,
                  from: tx.from,
                  to: tx.to || null,
                  value: ethers.formatEther(tx.value),
                  gasPrice: ethers.formatUnits(tx.gasPrice || 0, "gwei"),
                  gasUsed: receipt.gasUsed.toString(),
                  timestamp: block.timestamp,
                  status: receipt.status || 0,
                });
              }

              if (transactions.length >= limit) break;
            }
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error("Error searching transactions:", error);
      throw error;
    }
  }
}

export const chainDataService = new ChainDataService();
