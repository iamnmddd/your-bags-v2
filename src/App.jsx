import { useEffect, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Select from "react-select";
import numeral from "numeral";

const COINGECKO_LIST = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1";
const COINGECKO_PRICE =
  "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd%2Cusd_24h_change&ids=";
const COINGECKO_LOGO =
  "https://api.coingecko.com/api/v3/coins/"; // then append {id} and fetch .image.small

export default function App() {
  const [coinList, setCoinList] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem("yourBags");
    return saved ? JSON.parse(saved) : [];
  });
  const [prices, setPrices] = useState({});
  const [logos, setLogos] = useState({});

  useEffect(() => {
    fetch(COINGECKO_LIST)
      .then((res) => res.json())
      .then((data) => setCoinList(data));
  }, []);

  useEffect(() => {
    localStorage.setItem("yourBags", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    if (portfolio.length === 0) return;
    const ids = portfolio.map((coin) => coin.id).join(",");
    fetch(COINGECKO_PRICE + ids + "&include_24hr_change=true")
      .then((res) => res.json())
      .then((data) => setPrices(data));

    Promise.all(
      portfolio.map((coin) =>
        fetch(COINGECKO_LOGO + coin.id)
          .then((res) => res.json())
          .then((data) => ({ id: coin.id, logo: data.image.small }))
      )
    ).then((results) => {
      const logosMap = {};
      results.forEach(({ id, logo }) => {
        logosMap[id] = logo;
      });
      setLogos(logosMap);
    });
  }, [portfolio]);

  const addCoin = () => {
    if (!selectedCoin) return;
    if (portfolio.some((coin) => coin.id === selectedCoin.value)) return;
    const newCoin = {
      id: selectedCoin.value,
      name: selectedCoin.label,
      quantity: 1,
    };
    setPortfolio([...portfolio, newCoin]);
    setSelectedCoin(null);
  };

  const updateQuantity = (id, quantity) => {
    setPortfolio((prev) =>
      prev.map((coin) => (coin.id === id ? { ...coin, quantity } : coin))
    );
  };

  const deleteCoin = (id) => {
    setPortfolio((prev) => prev.filter((coin) => coin.id !== id));
  };

  const getTotalValue = () => {
    return portfolio.reduce((sum, coin) => {
      const price = prices[coin.id]?.usd || 0;
      return sum + coin.quantity * price;
    }, 0);
  };

  const options = coinList
    .sort((a, b) => b.market_cap - a.market_cap)
    .map((coin) => ({
      value: coin.id,
      label: `${coin.name} (${coin.symbol.toUpperCase()})`,
    }));

  function SortableItem({ coin }) {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: coin.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const price = prices[coin.id]?.usd || 0;
    const change = prices[coin.id]?.usd_24h_change || 0;

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="bg-white text-black p-4 rounded-lg shadow-md flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <img
            src={logos[coin.id]}
            alt="logo"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="font-bold text-lg">{coin.name}</div>
            <div className="text-sm text-gray-600">
              Quantity:
              <input
                type="number"
                min="0"
                step="any"
                value={coin.quantity}
                onChange={(e) =>
                  updateQuantity(coin.id, parseFloat(e.target.value))
                }
                className="bg-gray-200 ml-2 p-1 w-20 rounded"
              />
            </div>
            <div className="text-sm mt-1">
              <span className="text-gray-600">Price: </span>
              {numeral(price).format("$0,0.00")} (
              <span className={change < 0 ? "text-red-500" : "text-green-500"}>
                {numeral(change / 100).format("+0.00%")}
              </span>
              )
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-green-600 font-semibold">
            {numeral(price * coin.quantity).format("$0,0.00")}
          </div>
        </div>
        <button onClick={() => deleteCoin(coin.id)} className="text-red-500 ml-4">
          <X />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black p-4 flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-2 uppercase">YOUR BAGZ</h1>
      <div className="text-2xl font-semibold mb-6 text-green-600">
        Total: {numeral(getTotalValue()).format("$0,0.00")}
      </div>

      <div className="flex gap-2 w-full max-w-md mb-6">
        <div className="flex-grow">
          <Select
            options={options}
            value={selectedCoin}
            onChange={setSelectedCoin}
            placeholder="Search for a coin..."
          />
        </div>
        <button
          className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-white font-bold"
          onClick={addCoin}
        >
          +
        </button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (active.id !== over?.id) {
            const oldIndex = portfolio.findIndex((c) => c.id === active.id);
            const newIndex = portfolio.findIndex((c) => c.id === over?.id);
            setPortfolio(arrayMove(portfolio, oldIndex, newIndex));
          }
        }}
      >
        <SortableContext
          items={portfolio.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4 w-full max-w-md">
            {portfolio.map((coin) => (
              <SortableItem key={coin.id} coin={coin} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
