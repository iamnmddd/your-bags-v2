import { useState, useEffect } from "react";
import { X } from "lucide-react";
import numeral from "numeral";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=";
const COIN_LIST_API = "https://api.coingecko.com/api/v3/coins/list";
const COIN_LOGO_API = (id) => `https://cryptoicon-api.pages.dev/api/icon/${id}`;

export default function App() {
  const [coinInput, setCoinInput] = useState("");
  const [coinList, setCoinList] = useState([]);
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem("yourBags");
    return saved ? JSON.parse(saved) : [];
  });
  const [prices, setPrices] = useState({});

  useEffect(() => {
    fetch(COIN_LIST_API)
      .then((res) => res.json())
      .then((data) => setCoinList(data));
  }, []);

  useEffect(() => {
    localStorage.setItem("yourBags", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    if (portfolio.length === 0) return;
    const ids = portfolio.map((coin) => coin.id).join(",");
    fetch(COINGECKO_API + ids)
      .then((res) => res.json())
      .then((data) => setPrices(data));
  }, [portfolio]);

  const addCoin = async (coin) => {
    if (!coin) return;
    if (portfolio.find((c) => c.id === coin.id)) return;
    setPortfolio((prev) => [...prev, { id: coin.id, name: coin.name, symbol: coin.symbol, quantity: 1 }]);
    setCoinInput("");
  };

  const filteredCoins = coinList.filter((c) => {
    const input = coinInput.toLowerCase();
    return (
      c.id.toLowerCase().includes(input) ||
      c.name.toLowerCase().includes(input) ||
      c.symbol.toLowerCase().includes(input)
    );
  }).slice(0, 5);

  const updateQuantity = (id, quantity) => {
    setPortfolio((prev) =>
      prev.map((coin) => (coin.id === id ? { ...coin, quantity } : coin))
    );
  };

  const removeCoin = (id) => {
    setPortfolio((prev) => prev.filter((coin) => coin.id !== id));
  };

  const getTotalValue = () => {
    return portfolio.reduce((sum, coin) => {
      const price = prices[coin.id]?.usd || 0;
      return sum + coin.quantity * price;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-4">your bags</h1>
      <div className="text-xl font-semibold mb-6 text-green-400">
        Total: {numeral(getTotalValue()).format("$0,0.00")}
      </div>
      <div className="flex gap-2 mb-4 w-full max-w-md">
        <input
          className="bg-white text-black px-3 py-2 rounded w-full"
          placeholder="Enter coin name or symbol"
          value={coinInput}
          onChange={(e) => setCoinInput(e.target.value)}
        />
      </div>
      <div className="mb-6 w-full max-w-md">
        {filteredCoins.map((coin) => (
          <div key={coin.id} className="cursor-pointer hover:bg-gray-700 p-2 rounded" onClick={() => addCoin(coin)}>
            {coin.name} ({coin.symbol})
          </div>
        ))}
      </div>
      <div className="grid gap-4 w-full max-w-md">
        {portfolio.map((coin) => (
          <div key={coin.id} className="bg-gray-800 p-4 rounded shadow flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={COIN_LOGO_API(coin.symbol)}
                alt={coin.name}
                className="w-8 h-8 rounded-full"
                onError={(e) => e.target.style.display = 'none'}
              />
              <div>
                <div className="text-lg font-semibold">{coin.name}</div>
                <div className="text-sm text-gray-400">
                  Quantity: 
                  <input
                    type="number"
                    min="0"
                    value={coin.quantity}
                    onChange={(e) => updateQuantity(coin.id, parseFloat(e.target.value))}
                    className="bg-gray-700 text-white w-20 ml-1 rounded px-1"
                  />
                </div>
              </div>
            </div>
            <div className="text-right">
              <div>{numeral(prices[coin.id]?.usd).format("$0,0.00") || "-"}</div>
              <div className="text-sm text-green-400">
                {numeral(prices[coin.id]?.usd * coin.quantity || 0).format("$0,0.00")}
              </div>
              <button
                onClick={() => removeCoin(coin.id)}
                className="text-red-500 hover:text-red-700 mt-2"
              >
                <X />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
