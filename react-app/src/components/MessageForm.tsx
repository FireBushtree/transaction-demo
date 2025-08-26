import axios from "axios";
import { ethers } from "ethers";
import { useEffect, useState, type FormEvent } from "react";

export default function MessageForm() {
  const [formData, setFormData] = useState({
    message: undefined,
  });

  const [contractConfig, setContractConfig] = useState<any>();

  function getContractConfig() {
    axios.get("./InfoContract.json").then((res) => {
      setContractConfig(res.data);
    });
  }

  async function getContract() {
    const contractAbi = contractConfig.abi;
    const network = contractConfig.networks["5777"].address;
    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(network, contractAbi, signer);
    return contract;
  }

  useEffect(() => {
    getContractConfig();
  }, []);

  async function handleSubmit(e: FormEvent) {
    // TODO loading
    e.preventDefault();
    const contract = await getContract();
    const tx = await contract.setMessage(formData.message);
    console.log(tx)
    const receipt = await tx.wait();
    console.log(receipt);
  }

  async function handleRefresh() {
    const contract = await getContract();
    const filter = contract.filters.MessageChanged('0xcEd80C46bc309AD789DA0fC5E0C1dafBF433fe96');
    const events = await contract.queryFilter(filter, 0, "latest");
    console.log(events);
  }

  function handleInputChange(key: string, val: string) {
    setFormData({
      ...formData,
      [key]: val,
    });
  }

  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={handleRefresh}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        刷新数据
      </button>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 接收方地址 */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            message *
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange("message", e.target.value)}
            rows={3}
            placeholder="please input word"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm resize-none"
          />
        </div>

        <button
          type="submit"
          className={`w-full disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium text-sm transition-colors bg-blue-600 hover:bg-blue-700 cursor-pointer`}
        >
          提交
        </button>
      </form>
    </div>
  );
}
