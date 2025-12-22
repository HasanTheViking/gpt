import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isBought: boolean;
  lastBoughtAt?: string;
};

type ShoppingList = {
  id: string;
  title: string;
  items: Item[];
};

type Suggestion = {
  name: string;
  timesBought: number;
  lastBoughtAt: string;
};

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<ShoppingList | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, unit: "pcs", category: "other" });
  const [error, setError] = useState<string | null>(null);

  const loadList = async () => {
    try {
      const res = await api.get<ShoppingList>(`/lists/${id}`);
      setList(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load list");
    }
  };

  const loadSuggestions = async () => {
    const res = await api.get<{ suggestions: Suggestion[] }>("/suggestions");
    setSuggestions(res.data.suggestions);
  };

  useEffect(() => {
    if (id) {
      loadList();
      loadSuggestions();
    }
  }, [id]);

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    const res = await api.post<Item>(`/lists/${id}/items`, newItem);
    setList((prev) => (prev ? { ...prev, items: [res.data, ...prev.items] } : prev));
    setNewItem({ name: "", quantity: 1, unit: "pcs", category: "other" });
  };

  const toggleBought = async (item: Item) => {
    const res = await api.put<Item>(`/items/${item.id}`, { isBought: !item.isBought });
    setList((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it) => (it.id === item.id ? res.data : it)) }
        : prev
    );
    loadSuggestions();
  };

  const deleteItem = async (item: Item) => {
    await api.delete(`/items/${item.id}`);
    setList((prev) => (prev ? { ...prev, items: prev.items.filter((it) => it.id !== item.id) } : prev));
  };

  const addSuggestion = (suggestion: Suggestion) => {
    setNewItem((prev) => ({ ...prev, name: suggestion.name }));
  };

  const groupedItems = useMemo(() => {
    if (!list) return { open: [], bought: [] as Item[] };
    return {
      open: list.items.filter((i) => !i.isBought),
      bought: list.items.filter((i) => i.isBought)
    };
  }, [list]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <button className="text-slate-600 underline text-sm" onClick={() => navigate(-1)}>
        ← Back
      </button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {list ? (
        <>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800">{list.title}</h1>
              <p className="text-sm text-slate-500">Add items, check them off, and reuse suggestions.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full md:w-80">
              <h2 className="font-semibold text-slate-800 mb-3">Suggested for you</h2>
              <div className="space-y-2">
                {suggestions.length === 0 && <p className="text-sm text-slate-500">No suggestions yet.</p>}
                {suggestions.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-2 py-2"
                  >
                    <div>
                      <p className="text-slate-800 font-medium">{s.name}</p>
                      <p className="text-xs text-slate-500">
                        Bought {s.timesBought}× • Last: {new Date(s.lastBoughtAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => addSuggestion(s)}
                      className="text-xs px-2 py-1 bg-slate-900 text-white rounded-md hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="font-semibold text-slate-800">New item</h2>
            <div className="grid md:grid-cols-4 gap-3">
              <input
                placeholder="Name"
                className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={newItem.name}
                onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                placeholder="Quantity"
                type="number"
                className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={newItem.quantity}
                onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              />
              <input
                placeholder="Unit"
                className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={newItem.unit}
                onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
              />
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={newItem.category}
                onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="groceries">Groceries</option>
                <option value="cleaning">Cleaning</option>
                <option value="cosmetics">Cosmetics</option>
                <option value="pet">Pet</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              onClick={addItem}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Add item
            </button>
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-800">Items</h2>
            <div className="space-y-2">
              {groupedItems.open.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={toggleBought} onDelete={deleteItem} />
              ))}
              {groupedItems.open.length === 0 && (
                <p className="text-sm text-slate-500">Add items to your list to get started.</p>
              )}
            </div>
            {groupedItems.bought.length > 0 && (
              <div className="pt-2">
                <h3 className="text-sm text-slate-600 mb-2">Bought</h3>
                <div className="space-y-2">
                  {groupedItems.bought.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={toggleBought} onDelete={deleteItem} />
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <div>Loading list...</div>
      )}
    </div>
  );
}

function ItemRow({ item, onToggle, onDelete }: { item: Item; onToggle: (i: Item) => void; onDelete: (i: Item) => void }) {
  return (
    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
      <div>
        <p className={`font-medium ${item.isBought ? "line-through text-slate-400" : "text-slate-800"}`}>
          {item.name}
        </p>
        <p className="text-xs text-slate-500">
          {item.quantity} {item.unit} • {item.category}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(item)}
          className="text-xs px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
        >
          {item.isBought ? "Unmark" : "Bought"}
        </button>
        <button
          onClick={() => onDelete(item)}
          className="text-xs px-3 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
