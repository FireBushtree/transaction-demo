import axios from "axios";
import { ethers } from "ethers";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";

interface MessageEvent {
  transactionHash: string;
  blockNumber: number;
  sender: string;
  oldMessage: string;
  newMessage: string;
  timestamp: number;
}

export default function MessageForm() {
  const [formData, setFormData] = useState({
    message: "",
  });

  const [contractConfig, setContractConfig] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [messageEvents, setMessageEvents] = useState<MessageEvent[]>([]);
  const [allMessageEvents, setAllMessageEvents] = useState<MessageEvent[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [eventLoading, setEventLoading] = useState(false);
  const [senderFilter, setSenderFilter] = useState("");
  const [txProgress, setTxProgress] = useState(0);
  const [txStep, setTxStep] = useState("");
  const eventsPerPage = 10;

  function getContractConfig() {
    axios.get("./InfoContract.json").then((res) => {
      setContractConfig(res.data);
    });
  }

  async function getContract() {
    const contractAbi = contractConfig.abi;
    const network = contractConfig.networks["11155111"].address;
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(network, contractAbi, signer);
    return contract;
  }

  useEffect(() => {
    getContractConfig();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!formData.message.trim()) {
      setError("请输入消息内容");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setTxProgress(0);
    setTxStep("");

    try {
      // 步骤1: 准备合约
      setTxStep("准备合约连接...");
      setTxProgress(10);
      const contract = await getContract();

      // 步骤2: 发送交易
      setTxStep("发送交易到区块链...");
      setTxProgress(25);
      const tx = await contract.setMessage(formData.message);
      console.log("交易已发送:", tx.hash);

      // 步骤3: 等待打包
      setTxStep("等待交易被矿工打包...");
      setTxProgress(50);

      // 模拟等待过程中的进度更新
      const progressInterval = setInterval(() => {
        setTxProgress(prev => {
          if (prev < 75) {
            return prev + 5;
          }
          return prev;
        });
      }, 1000);

      // 监听交易确认
      const receipt = await tx.wait(1); // 等待1个确认
      clearInterval(progressInterval);

      setTxStep("交易已被确认...");
      setTxProgress(80);

      console.log("交易已确认:", receipt);

      // 步骤4: 更新数据
      setTxStep("更新合约数据...");
      setTxProgress(90);

      // 刷新当前消息和历史记录
      await fetchCurrentMessage();
      await fetchMessageHistory();

      // 步骤5: 完成
      setTxStep("交易完成!");
      setTxProgress(100);
      setSuccess(true);
      setFormData({ message: "" });

      // 3秒后重置进度
      setTimeout(() => {
        setTxProgress(0);
        setTxStep("");
      }, 3000);

    } catch (err: any) {
      console.error("设置消息失败:", err);
      let errorMessage = "设置消息失败";

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
      setLoading(false);

      if (success) {
        setTimeout(() => setSuccess(false), 3000);
      }
    }
  }

  async function fetchCurrentMessage() {
    try {
      const contract = await getContract();
      const message = await contract.message();
      setCurrentMessage(message);
    } catch (err) {
      console.error("获取当前消息失败:", err);
    }
  }

  async function fetchMessageHistory(filterSender?: string) {
    if (!contractConfig) return;

    setEventLoading(true);
    setError("");

    try {
      const contract = await getContract();
      const provider = new ethers.BrowserProvider(window.ethereum!);

      // 根据是否有发送者过滤条件创建不同的过滤器
      let filter;
      if (filterSender && ethers.isAddress(filterSender)) {
        // 使用 indexed 参数过滤特定发送者的事件
        filter = contract.filters.MessageChanged(filterSender);
      } else {
        // 获取所有 MessageChanged 事件
        filter = contract.filters.MessageChanged();
      }

      const events = await contract.queryFilter(filter, 0, "latest");

      const messageHistory: MessageEvent[] = [];

      for (const event of events) {
        const block = await provider.getBlock(event.blockNumber);
        console.log(event)

        // 确保事件是 EventLog 类型，有 args 属性
        if ('args' in event && event.args) {
          messageHistory.push({
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            sender: event.args[0],
            oldMessage: event.args[1],
            newMessage: event.args[2],
            timestamp: (block?.timestamp || 0) * 1000,
          });
        }
      }

      // 按时间戳排序（最新的在前）
      messageHistory.sort((a, b) => b.timestamp - a.timestamp);

      if (filterSender) {
        setMessageEvents(messageHistory);
      } else {
        setAllMessageEvents(messageHistory);
        setMessageEvents(messageHistory);
      }

    } catch (err) {
      console.error("获取消息历史失败:", err);
      setError("获取合约数据失败，请检查网络连接");
    } finally {
      setEventLoading(false);
    }
  }

  function handleInputChange(key: string, val: string) {
    setFormData({
      ...formData,
      [key]: val,
    });
  }

  // 格式化地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("zh-CN");
  };

  // 分页逻辑
  const totalPages = Math.ceil(messageEvents.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const paginatedEvents = messageEvents.slice(startIndex, startIndex + eventsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSenderFilterChange = (value: string) => {
    setSenderFilter(value);
  };

  const handleFilterSubmit = () => {
    setCurrentPage(1); // 重置到第一页
    if (senderFilter.trim()) {
      fetchMessageHistory(senderFilter.trim());
    } else {
      setMessageEvents(allMessageEvents);
    }
  };

  const handleClearFilter = () => {
    setSenderFilter("");
    setCurrentPage(1);
    setMessageEvents(allMessageEvents);
  };

  const handleSenderClick = (sender: string) => {
    setSenderFilter(sender);
    setCurrentPage(1);
    fetchMessageHistory(sender);
  };

  // 初始化数据
  useEffect(() => {
    if (contractConfig) {
      fetchCurrentMessage();
      fetchMessageHistory();
    }
  }, [contractConfig]);

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto">
        {/* 当前消息显示 */}
        {currentMessage && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">当前合约消息</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground break-all">
                {currentMessage}
              </p>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="message">新消息 *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange("message", e.target.value)}
              rows={3}
              placeholder="请输入新的消息内容"
              disabled={loading}
              className="resize-none"
            />
          </div>

          {/* 进度条 */}
          {loading && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">交易进度</span>
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

          {/* 状态提示 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>消息设置成功！</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading || !formData.message.trim()}
            className="w-full"
            size="lg"
          >
            {loading && (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
            )}
            {loading ? "提交中..." : "设置消息"}
          </Button>
        </form>
      </div>

      {/* 消息历史表格 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>消息变更历史</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMessageHistory()}
              disabled={eventLoading}
            >
              {eventLoading ? (
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              ) : null}
              刷新
            </Button>
          </div>

          {/* 过滤器 */}
          <div className="mt-4 space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-2 w-xs">
                <Label htmlFor="senderFilter">
                  发送者
                  <span className="text-xs text-muted-foreground ml-1">
                    - 点击表格中的发送者地址
                  </span>
                </Label>
                <Input
                  id="senderFilter"
                  placeholder="输入发送者地址... (0x...)"
                  value={senderFilter}
                  onChange={(e) => handleSenderFilterChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFilterSubmit();
                    }
                  }}
                  disabled={eventLoading}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilter}
                  disabled={eventLoading}
                >
                  清除
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-2">正在加载消息历史...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : messageEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无消息变更记录
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>交易哈希</TableHead>
                    <TableHead>发送者</TableHead>
                    <TableHead>原消息</TableHead>
                    <TableHead>新消息</TableHead>
                    <TableHead>区块号</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEvents.map((event) => (
                    <TableRow key={event.transactionHash}>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {formatAddress(event.transactionHash)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code
                          className="text-xs cursor-pointer hover:bg-accent px-1 py-0.5 rounded transition-colors"
                          onClick={() => handleSenderClick(event.sender)}
                          title={`点击过滤此发送者: ${event.sender}`}
                        >
                          {formatAddress(event.sender)}
                        </code>
                      </TableCell>
                      <TableCell className="max-w-32">
                        <div
                          className="break-all text-sm text-muted-foreground overflow-hidden text-ellipsis"
                          title={event.oldMessage}
                        >
                          {event.oldMessage.length > 20
                            ? `${event.oldMessage.slice(0, 20)}...`
                            : event.oldMessage || '(空)'
                          }
                        </div>
                      </TableCell>
                      <TableCell className="max-w-32">
                        <div
                          className="break-all text-sm font-medium overflow-hidden text-ellipsis"
                          title={event.newMessage}
                        >
                          {event.newMessage.length > 20
                            ? `${event.newMessage.slice(0, 20)}...`
                            : event.newMessage
                          }
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {event.blockNumber}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTime(event.timestamp)}
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
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
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
}
