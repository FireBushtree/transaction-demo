import React, { useState } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";

interface TransferFormData {
  recipientAddress: string;
  amount: string;
  inputData: string;
}

interface TransactionHistory {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  timestamp: number;
  blockNumber: number;
  data?: string;
  status: "success" | "failed" | "pending";
}

type TransactionStatus =
  | "idle"
  | "preparing"
  | "pending"
  | "confirmed"
  | "failed";

const TransferForm: React.FC = () => {
  const [formData, setFormData] = useState<TransferFormData>({
    recipientAddress: "",
    amount: "",
    inputData: "",
  });

  const [txStatus, setTxStatus] = useState<TransactionStatus>("idle");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [txProgress, setTxProgress] = useState(0);
  const [txStep, setTxStep] = useState("");
  const transactionsPerPage = 10;

  const handleInputChange = (field: keyof TransferFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatInputData = (val: string) => {
    return val === '0x' ? undefined : val
  }

  const fetchTransactionHistory = async () => {
    if (!window.ethereum) return;

    setLoading(true);
    setError("");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (accounts.length === 0) {
        setLoading(false);
        return;
      }

      const currentAddress = accounts[0];
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 500); // 减少到最近500个区块以提高性能

      console.log(`正在扫描从区块 ${fromBlock} 到 ${currentBlock} 的交易...`);

      const realTransactions: TransactionHistory[] = [];
      const totalBlocks = currentBlock - fromBlock + 1;

      setScanProgress({ current: 0, total: totalBlocks });

      // 批量处理区块以提高效率，减少批次大小以获得更好的进度反馈
      const batchSize = 50;
      let processedBlocks = 0;

      for (let i = fromBlock; i <= currentBlock; i += batchSize) {
        const endBlock = Math.min(i + batchSize - 1, currentBlock);

        try {
          // 获取这个范围内的区块
          const blockPromises = [];
          for (let blockNum = i; blockNum <= endBlock; blockNum++) {
            blockPromises.push(provider.getBlock(blockNum, true)); // true 表示包含交易详情
          }

          const blocks = await Promise.all(blockPromises);
          processedBlocks += blocks.length;
          setScanProgress({ current: processedBlocks, total: totalBlocks });

          for (const block of blocks) {
            if (!block || !block.transactions) continue;

            // 检查每个交易是否与当前地址相关
            for (const tx of block.transactions) {
              const txData = (await provider.getTransaction(tx))!;

              // 检查是否是与当前地址相关的交易
              if (
                txData.from?.toLowerCase() === currentAddress.toLowerCase() ||
                txData.to?.toLowerCase() === currentAddress.toLowerCase()
              ) {
                // 获取交易回执以确定状态
                let status: "success" | "failed" | "pending" = "success";
                try {
                  const receipt = await provider.getTransactionReceipt(
                    txData.hash
                  );
                  status =
                    receipt && receipt.status === 1 ? "success" : "failed";
                } catch (err) {
                  status = "pending";
                }

                realTransactions.push({
                  hash: txData.hash,
                  from: txData.from || "",
                  to: txData.to || "",
                  value: ethers.formatEther(txData.value || "0"),
                  gasUsed: txData.gasLimit ? txData.gasLimit.toString() : "0",
                  gasPrice: txData.gasPrice
                    ? ethers.formatUnits(txData.gasPrice, "gwei")
                    : "0",
                  timestamp: block.timestamp * 1000, // 转换为毫秒
                  blockNumber: block.number || 0,
                  status,
                  data: formatInputData(txData.data),
                });
              }
            }
          }
        } catch (blockErr) {
          console.warn(`获取区块 ${i}-${endBlock} 失败:`, blockErr);
          // 继续处理下一批区块，不中断整个流程
          continue;
        }
      }

      // 按时间戳排序（最新的在前）
      realTransactions.sort((a, b) => b.timestamp - a.timestamp);

      console.log(realTransactions);
      console.log(`找到 ${realTransactions.length} 条相关交易`);
      setTransactions(realTransactions);
    } catch (err) {
      console.error("获取交易历史失败:", err);

      // 如果获取真实数据失败，显示错误信息而不是模拟数据
      setError("获取交易历史失败，请检查网络连接或稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipientAddress || !formData.amount) {
      alert("请填写接收方地址和转账金额");
      return;
    }

    if (!window.ethereum) {
      alert("请安装 MetaMask!");
      return;
    }

    setError("");
    setTxHash("");
    setTxStatus("preparing");
    setTxProgress(0);
    setTxStep("");

    try {
      // 步骤1: 检查钱包连接
      setTxStep("检查钱包连接...");
      setTxProgress(10);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_accounts", []);

      if (accounts.length === 0) {
        alert("请先连接钱包");
        setTxStatus("idle");
        setTxProgress(0);
        setTxStep("");
        return;
      }

      // 步骤2: 验证地址格式
      setTxStep("验证地址格式...");
      setTxProgress(20);
      if (!ethers.isAddress(formData.recipientAddress)) {
        throw new Error("接收方地址格式无效");
      }

      // 步骤3: 获取signer和准备交易
      setTxStep("准备交易参数...");
      setTxProgress(30);
      const signer = await provider.getSigner();

      // 构建交易参数
      const txParams: any = {
        to: formData.recipientAddress,
        value: ethers.parseEther(formData.amount),
      };

      // 如果有 input data，添加到交易中
      if (formData.inputData.trim()) {
        if (!formData.inputData.startsWith("0x")) {
          throw new Error("Input Data 必须以 0x 开头");
        }
        txParams.data = formData.inputData;
      }

      // 步骤4: 发送交易到区块链
      setTxStep("发送交易到区块链...");
      setTxProgress(40);
      setTxStatus("pending");
      const tx = await signer.sendTransaction(txParams);
      setTxHash(tx.hash);
      console.log("交易已发送:", tx.hash);

      // 步骤5: 等待交易被矿工打包
      setTxStep("等待交易被矿工打包...");
      setTxProgress(60);
      
      // 模拟等待过程中的进度更新
      const progressInterval = setInterval(() => {
        setTxProgress(prev => {
          if (prev < 80) {
            return prev + 5;
          }
          return prev;
        });
      }, 1000);

      // 等待交易确认
      setTxStatus("confirmed");
      const receipt = await tx.wait(1); // 等待1个确认
      clearInterval(progressInterval);
      
      setTxStep("交易已被确认...");
      setTxProgress(85);
      console.log("交易已确认:", receipt);

      // 步骤6: 更新交易历史
      setTxStep("更新交易历史...");
      setTxProgress(95);
      
      // 重新获取交易历史
      await fetchTransactionHistory();

      // 步骤7: 完成
      setTxStep("转账完成!");
      setTxProgress(100);

      // 重置表单
      setFormData({
        recipientAddress: "",
        amount: "",
        inputData: "",
      });

      // 3秒后重置进度
      setTimeout(() => {
        setTxProgress(0);
        setTxStep("");
      }, 3000);

    } catch (err: any) {
      console.error("转账失败:", err);
      setTxStatus("failed");

      let errorMessage = "转账失败";
      if (err.code === 4001) {
        errorMessage = "用户取消了交易";
      } else if (err.code === -32603) {
        errorMessage = "余额不足或网络错误";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setTxProgress(0);
      setTxStep("");
    } finally {
      if (txStatus !== "confirmed") {
        setTimeout(() => {
          setTxStatus("idle");
          setTxProgress(0);
          setTxStep("");
        }, 3000);
      }
    }
  };

  const isFormValid =
    formData.recipientAddress.trim() !== "" &&
    formData.amount.trim() !== "";

  const getStatusText = () => {
    switch (txStatus) {
      case "preparing":
        return "准备交易中...";
      case "pending":
        return "等待用户确认...";
      case "confirmed":
        return "交易已确认";
      case "failed":
        return "交易失败";
      default:
        return "提交转账";
    }
  };

  const getButtonVariant = ():
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link" => {
    switch (txStatus) {
      case "confirmed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "default";
    }
  };

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  // 分页逻辑
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedTransactions = transactions.slice(
    startIndex,
    startIndex + transactionsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 组件挂载时获取交易历史
  React.useEffect(() => {
    fetchTransactionHistory();
  }, []);

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 接收方地址 */}
          <div className="space-y-2">
            <Label htmlFor="recipient">接收方地址 *</Label>
            <Input
              id="recipient"
              type="text"
              value={formData.recipientAddress}
              onChange={(e) =>
                handleInputChange("recipientAddress", e.target.value)
              }
              placeholder="0x..."
              disabled={txStatus !== "idle"}
            />
          </div>

          {/* 转账金额 */}
          <div className="space-y-2">
            <Label htmlFor="amount">转账金额 (ETH) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange("amount", e.target.value)}
              placeholder="0.1"
              disabled={txStatus !== "idle"}
            />
          </div>

          {/* Input Data */}
          <div className="space-y-2">
            <Label htmlFor="inputData">Input Data</Label>
            <Textarea
              id="inputData"
              value={formData.inputData}
              onChange={(e) => handleInputChange("inputData", e.target.value)}
              placeholder="0x... (可选)"
              rows={3}
              disabled={txStatus !== "idle"}
              className="resize-none"
            />
          </div>

          {/* 进度条 */}
          {(txStatus === "preparing" || txStatus === "pending") && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">转账进度</span>
                  <span className="text-sm font-mono text-primary">{txProgress}%</span>
                </div>
                <Progress value={txProgress} className="h-2" />
                {txStep && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full flex-shrink-0"></div>
                    <span className="text-sm text-muted-foreground">{txStep}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 交易状态 */}
          {txStatus !== "idle" && txStatus !== "preparing" && txStatus !== "pending" && (
            <Alert variant={txStatus === "failed" ? "destructive" : "default"}>
              <div className="flex items-center space-x-2">
                {txStatus === "confirmed" && (
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {txStatus === "failed" && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span className="font-medium">{getStatusText()}</span>
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
                {error && <p className="mt-2">{error}</p>}
              </AlertDescription>
            </Alert>
          )}

          {/* 提交按钮 */}
          <Button
            type="submit"
            disabled={!isFormValid || txStatus !== "idle"}
            variant={getButtonVariant()}
            className="w-full"
            size="lg"
          >
            {(txStatus === "preparing" || txStatus === "pending") && (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
            )}
            {(txStatus === "preparing" || txStatus === "pending") ? "交易进行中..." : getStatusText()}
          </Button>
        </form>
      </div>

      {/* 交易历史表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>交易历史</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactionHistory}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              ) : null}
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <div className="text-center">
                <p className="text-sm">正在扫描区块链交易...</p>
                {scanProgress.total > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    进度: {scanProgress.current} / {scanProgress.total} 区块
                  </p>
                )}
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无交易记录
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>交易哈希</TableHead>
                    <TableHead>发送方</TableHead>
                    <TableHead>接收方</TableHead>
                    <TableHead>金额 (ETH)</TableHead>
                    <TableHead>Input Data</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx) => (
                    <TableRow key={tx.hash}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {formatAddress(tx.hash)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">
                          {formatAddress(tx.from)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{formatAddress(tx.to)}</code>
                      </TableCell>
                      <TableCell className="font-mono">{tx.value}</TableCell>
                      <TableCell width={300} className="font-mono">
                        <div
                          style={{ width: 300 }}
                          title={tx.data || '-'}
                          className="break-all whitespace-nowrap overflow-hidden text-ellipsis"
                        >
                          {tx.data || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            tx.status === "success"
                              ? "bg-green-100 text-green-800"
                              : tx.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {tx.status === "success"
                            ? "成功"
                            : tx.status === "failed"
                            ? "失败"
                            : "待确认"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(tx.timestamp)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页导航 */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1)
                              handlePageChange(currentPage - 1);
                          }}
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages)
                              handlePageChange(currentPage + 1);
                          }}
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferForm;
