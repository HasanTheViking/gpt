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

const CATEGORIES: { value: string; label: string }[] = [
  { value: "groceries", label: "Potraviny" },
  { value: "cleaning", label: "Drogéria" },
  { value: "cosmetics", label: "Kozmetika" },
  { value: "pet", label: "Zvieratá" },
  { value: "other", label: "Iné" }
];

function formatCategory(cat: string) {
  const hit = CATEGORIES.find((c) => c.value === cat);
  return hit?.label ?? cat ?? "Iné";
}

function categoryBadgeClasses(cat: string) {
  // neutrálny, ale jasne rozlíšený dizajn bez custom farieb
  switch (cat) {
    case "groceries":
      return "bg-slate-900 text-white";
    case "cleaning":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "cosmetics":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "pet":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<ShoppingList | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 1,
    unit: "ks",
    category: "other"
  });

  const [loading, setLoading] = useState(true);
  const [busyAdd, setBusyAdd] = useState(false);
  const [busyDeleteList, setBusyDeleteList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = async () => {
    if (!id) return;
    try {
      const res = await api.get<ShoppingList>(`/lists/${id}`);
      setList(res.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa načítať zoznam");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const res = await api.get<{ suggestions: Suggestion[] }>("/suggestions");
      setSuggestions(res.data.suggestions ?? []);
    } catch {
      // suggestions sú pomocné – keď failnú, appka má fungovať ďalej
      setSuggestions([]);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      loadList();
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const groupedItems = useMemo(() => {
    if (!list) return { open: [] as Item[], bought: [] as Item[] };

    const open = list.items
      .filter((i) => !i.isBought)
      .sort((a, b) => a.name.localeCompare(b.name));

    const bought = list.items
      .filter((i) => i.isBought)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { open, bought };
  }, [list]);

  const deleteList = async () => {
    if (!list) return;
    const ok = window.confirm(`Naozaj chceš zmazať zoznam „${list.title}“?`);
    if (!ok) return;

    setBusyDeleteList(true);
    setError(null);

    try {
      await api.delete(`/lists/${list.id}`);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa zmazať zoznam");
    } finally {
      setBusyDeleteList(false);
    }
  };

  const addItem = async () => {
    if (!id) return;
    const name = newItem.name.trim();
    if (!name) return;

    setBusyAdd(true);
    setError(null);

    try {
      const payload = {
        name,
        quantity: Number(newItem.quantity) || 1,
        unit: (newItem.unit || "ks").trim() || "ks",
        category: newItem.category || "other"
      };

      const res = await api.post<Item>(`/lists/${id}/items`, payload);

      setList((prev) =>
        prev ? { ...prev, items: [res.data, ...prev.items] } : prev
      );

      setNewItem({
        name: "",
        quantity: 1,
        unit: "ks",
        category: newItem.category || "other"
      });

      loadSuggestions();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa pridať položku");
    } finally {
      setBusyAdd(false);
    }
  };

  const toggleBought = async (item: Item) => {
    try {
      const res = await api.put<Item>(`/items/${item.id}`, { isBought: !item.isBought });
      setList((prev) =>
        prev
          ? { ...prev, items: prev.items.map((it) => (it.id === item.id ? res.data : it)) }
          : prev
      );
      loadSuggestions();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa upraviť položku");
    }
  };

  const deleteItem = async (item: Item) => {
    try {
      await api.delete(`/items/${item.id}`);
      setList((prev) =>
        prev ? { ...prev, items: prev.items.filter((it) => it.id !== item.id) } : prev
      );
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa zmazať položku");
    }
  };

  const addSuggestionToInput = (suggestion: Suggestion) => {
    setNewItem((prev) => ({ ...prev, name: suggestion.name }));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (!id) return null;

  return (
    <div className="pb-28">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          onClick={() => navigate(-1)}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
            ←
          </span>
          Späť
        </button>

        <button
          onClick={() => {
            setLoading(true);
            loadList();
            loadSuggestions();
          }}
          className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium bg-white border border-slate-200 shadow-sm hover:bg-slate-50"
        >
          Obnoviť
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 truncate">
                {list?.title ?? "Zoznam"}
              </h1>

              <button
                onClick={deleteList}
                disabled={busyDeleteList || !list}
                className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                title="Zmazať zoznam"
              >
                {busyDeleteList ? "Mažem…" : "Zmazať"}
              </button>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Ťukni na položku a označ ju ako kúpenú. História nákupov tvorí návrhy.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">
              {list ? list.items.length : 0}
            </div>
            <div>položky</div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Návrhy</h2>
            <span className="text-xs text-slate-500">
              {suggestions.length ? `${suggestions.length} návrhov` : "—"}
            </span>
          </div>

          {suggestions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Zatiaľ žiadne návrhy. Keď niečo kúpiš viackrát, objaví sa to tu.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => addSuggestionToInput(s)}
                  className="shrink-0 text-left rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {s.timesBought}× • {new Date(s.lastBoughtAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-700 underline">
                    Pridať do poľa
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-5 space-y-5">
        {/* Items open */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Na kúpu</h2>
            <span className="text-xs text-slate-500">{groupedItems.open.length} položiek</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Načítavam…
            </div>
          ) : groupedItems.open.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Zoznam je prázdny. Pridaj položky pomocou panelu dole.
            </div>
          ) : (
            <div className="space-y-2">
              {groupedItems.open.map((item) => (
                <ItemCard key={item.id} item={item} onToggle={toggleBought} onDelete={deleteItem} />
              ))}
            </div>
          )}
        </section>

        {/* Bought */}
        {groupedItems.bought.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Kúpené</h2>
              <span className="text-xs text-slate-500">{groupedItems.bought.length} položiek</span>
            </div>

            <div className="space-y-2">
              {groupedItems.bought.map((item) => (
                <ItemCard key={item.id} item={item} onToggle={toggleBought} onDelete={deleteItem} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Add Bar */}
      <div className="fixed left-0 right-0 bottom-0 z-20">
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-3">
            <div className="flex items-center gap-2">
              <input
                placeholder="Pridať položku…"
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={newItem.name}
                onChange={(e) => setNewItem((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItem();
                }}
              />

              <button
                onClick={addItem}
                disabled={busyAdd}
                className="shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {busyAdd ? "Pridávam…" : "Pridať"}
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <input
                placeholder="Ks"
                type="number"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={newItem.quantity}
                onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
              />

              <input
                placeholder="Jednotka"
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={newItem.unit}
                onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
              />

              <select
                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                value={newItem.category}
                onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 mt-2">
            Tip: Ťukni na návrh a názov sa doplní do poľa.
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onToggle,
  onDelete
}: {
  item: Item;
  onToggle: (i: Item) => void;
  onDelete: (i: Item) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-base font-semibold truncate ${
                item.isBought ? "line-through text-slate-400" : "text-slate-900"
              }`}
            >
              {item.name}
            </p>

            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${categoryBadgeClasses(
                item.category
              )}`}
              title={formatCategory(item.category)}
            >
              {formatCategory(item.category)}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-1">
            {item.quantity} {item.unit}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(item)}
            className={`rounded-2xl px-3 py-2 text-xs font-semibold border ${
              item.isBought
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {item.isBought ? "Vrátiť" : "Kúpené"}
          </button>

          <button
            onClick={() => onDelete(item)}
            className="rounded-2xl px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
          >
            Zmazať
          </button>
        </div>
      </div>
    </div>
  );
}
