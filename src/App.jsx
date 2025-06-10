// PASO 1: App completa con todas las funciones

import { useState, useEffect } from "react";
import { GripVertical, X } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COINGECKO_SEARCH_API = "https://api.coingecko.com/api/v3/search?query=";
const COINGECKO_PRICE_API =
  "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=";
const COINGECKO_IMAGE = (id) => `https://coinicons-api.vercel.app/api/icon/${id}`;

function SortableItem({ coin, index, updateQuantity, removeCoin }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: coin.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-gray-800 p-4 rounded shadow flex justify-between items-center"
    >
      <div className="flex items-center gap-3">
        <div {...listeners} className="cursor-grab">
          <GripVertical size={18} />
        </div>
        <img src={COINGECKO_IMAGE(coin.symbol)} alt="logo" className="w-6 h-6" />
        <div>
          <div className="font-semibold">{coin.name}</div>
          <input
            type="number"
            min="0"
            value={coin.quantity}
            onChange={(e) =>
              updateQuantity(coin.id, parseFloat(e.target.value))
            }
            className="bg-gray-700 text-white w-20 mt-1 rounded px-1"
          />
        </div>
      </div>
      <div className="text-right">
        <div>${coin.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        <div className="text-green-400 text-sm">
          ${(coin.quantity * coin.price)?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </div>
        <button
          className="text-red-400 text-xs mt-2"
          onClick={() => removeCoin(coin.id)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [coinInput, setCoinInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem("yourBags");
    return saved ? JSON.parse(saved) : [];
  });

  const fetchPrices = async () => {
    if (portfolio.length === 0) return;
    const ids = portfolio.map((c) => c.id).join(",");
    const res = await fetch(COINGECKO_PRICE_API + ids);
    const data = await res.json();
    setPortfolio((prev) =>
      prev.map((coin) => ({
        ...coin,
        price: data[coin.id]?.usd ?? 0,
      }))
    );
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    localStorage.setItem("yourBags", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    if (coinInput.length < 2) {
      setSuggestions([]);
      return;
    }
    fetch(COINGECKO_SEARCH_API + coinInput)
      .then((res) => res.json())
      .then((data) => {
        const unique = new Map();
        data.coins.forEach((coin) => {
          const key = coin.id;
          if (!unique.has(key))
            unique.set(key, {
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
            });
        });
        setSuggestions(Array.from(unique.values()));
      });
  }, [coinInput]);

  const addCoin = async (coinObj) => {
    if (!coinObj) return;
    if (portfolio.find((c) => c.id === coinObj.id)) return;
    const res = await fetch(COINGECKO_PRICE_API + coinObj.id);
    const data = await res.json();
    setPortfolio((prev) => [
      ...prev,
      {
        id: coinObj.id,
        name: coinObj.name,
        symbol: coinObj.symbol,
        quantity: 1,
        price: data[coinObj.id]?.usd ?? 0,
      },
    ]);
    setCoinInput("");
    setSuggestions([]);
  };

  const updateQuantity = (id, quantity) => {
    setPortfolio((prev) =>
      prev.map((coin) => (coin.id === id ? { ...coin, quantity } : coin))
    );
  };

  const removeCoin = (id) => {
    setPortfolio((prev) => prev.filter((coin) => coin.id !== id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = portfolio.findIndex((c) => c.id === active.id);
    const newIndex = portfolio.findIndex((c) => c.id === over.id);
    setPortfolio(arrayMove(portfolio, oldIndex, newIndex));
  };

  const getTotalValue = () => {
    return portfolio.reduce((sum, c) => sum + c.quantity * c.price, 0);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4">your bags</h1>
      <div className="text-xl font-semibold mb-4 text-green-400">
        Total: ${getTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          className="bg-white text-black px-2 py-1 rounded w-full"
          placeholder="Enter coin name or symbol"
          value={coinInput}
          onChange={(e) => setCoinInput(e.target.value)}
        />
        <button
          onClick={fetchPrices}
          className="bg-blue-600 text-white font-bold px-4 rounded"
        >
          Refresh
        </button>
      </div>
      <div className="bg-white text-black rounded shadow-md">
        {suggestions.map((coin) => (
          <div
            key={coin.id}
            className="px-3 py-2 border-b hover:bg-gray-200 cursor-pointer"
            onClick={() => addCoin(coin)}
          >
            {coin.name} ({coin.symbol.toUpperCase()})
          </div>
        ))}
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={portfolio.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3 mt-4">
            {portfolio.map((coin, index) => (
              <SortableItem
                key={coin.id}
                coin={coin}
                index={index}
                updateQuantity={updateQuantity}
                removeCoin={removeCoin}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
