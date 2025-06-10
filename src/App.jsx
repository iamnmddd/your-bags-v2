import { useState, useEffect } from "react";
import { GripVertical, RefreshCcw, X } from "lucide-react";
import Select from "react-select";
import numeral from "numeral";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

function SortableCoin({ coin, updateQuantity, removeCoin }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: coin.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <GripVertical className="cursor-grab" {...attributes} {...listeners} />
        <img src={coin.image} alt={coin.name} className="w-8 h-8" />
        <div>
          <div className="font-semibold text-white">{coin.name}</div>
          <input
            type="number"
            min="0"
            step="any"
            value={coin.quantity}
            onChange={(e) => updateQuantity(coin.id, parseFloat(e.target.value))}
            className="bg-gray-700 text-white rounded px-2 py-1 w-24 mt-1"
          />
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-300">
          {coin.price ? `$${numeral(coin.price).format("0,0.00")}` : "-"}
        </div>
        <div className="text-green-400 font-semibold">
          ${numeral(coin.quantity * coin.price).format("0,0.00")}
        </div>
        <button onClick={() => removeCoin(coin.id)} className="text-red-400 mt-2">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem("yourBags");
    return saved ? JSON.parse(saved) : [];
  });
  const [coinOptions, setCoinOptions] = useState([]);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetch(`${COINGECKO_API}/coins/list`)
      .then((res) => res.json())
      .then((data) => {
        const options = data.map((coin) => ({
          value: coin.id,
          label: coin.name,
        }));
        setCoinOptions(options);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("yourBags", JSON.stringify(portfolio));
  }, [portfolio]);

  const fetchPrices = async () => {
    if (portfolio.length === 0) return;
    const ids = portfolio.map((c) => c.id).join(",");
    const res = await fetch(
      `${COINGECKO_API}/simple/price?vs_currencies=usd&ids=${ids}`
    );
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

  const addCoin = async () => {
    if (!selectedCoin) return;
    const exists = portfolio.find((c) => c.id === selectedCoin.value);
    if (exists) return alert("Coin already in your bags");
    const res = await fetch(`${COINGECKO_API}/coins/${selectedCoin.value}`);
    const data = await res.json();
    const coin = {
      id: data.id,
      name: data.name,
      image: data.image.small,
      quantity: 1,
      price: data.market_data.current_price.usd,
    };
    setPortfolio((prev) => [...prev, coin]);
    setSelectedCoin(null);
  };

  const updateQuantity = (id, quantity) => {
    setPortfolio((prev) =>
      prev.map((coin) => (coin.id === id ? { ...coin, quantity } : coin))
    );
  };

  const removeCoin = (id) => {
    setPortfolio((prev) => prev.filter((coin) => coin.id !== id));
  };

  const totalValue = portfolio.reduce(
    (sum, c) => sum + c.quantity * (c.price || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">your bags</h1>
        <button
          onClick={fetchPrices}
          className="flex items-center gap-2 text-green-400 hover:text-green-300"
        >
          <RefreshCcw size={16} /> Refresh
        </button>
      </div>

      <div className="mb-4">
        <Select
          options={coinOptions}
          value={selectedCoin}
          onChange={setSelectedCoin}
          placeholder="Search coin (e.g. Bitcoin, Tether...)"
          className="text-black"
        />
        <button
          onClick={addCoin}
          className="bg-green-500 mt-2 px-4 py-2 rounded text-white font-bold"
        >
          Add Coin
        </button>
      </div>

      <div className="text-xl mb-6">
        Total: <span className="text-green-400 font-bold">${numeral(totalValue).format("0,0.00")}</span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (active.id !== over?.id) {
            const oldIndex = portfolio.findIndex((c) => c.id === active.id);
            const newIndex = portfolio.findIndex((c) => c.id === over?.id);
            setPortfolio(arrayMove(portfolio, oldIndex, newIndex));
          }
        }}
      >
        <SortableContext items={portfolio.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4">
            {portfolio.map((coin) => (
              <SortableCoin
                key={coin.id}
                coin={coin}
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
