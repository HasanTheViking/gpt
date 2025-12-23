
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

type ShoppingList = {
  id: string;
  title: string;
  isArchived: boolean;
  shareToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function ListsPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadLists = async () => {
    setError(null);
    try {
      const res = await api.get<ShoppingList[]>("/lists");
      setLists(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa načítať zoznamy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const createList = async () => {
    const name = title.trim();
    if (!name) return;

    setError(null);
    try {
      const res = await api.post<ShoppingList>("/lists", { title: name });
      setLists((prev) => [res.data, ...prev]);
      setTitle("");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa vytvoriť zoznam.");
    }
  };

  const deleteList = async (list: ShoppingList) => {
    const ok = window.confirm(`Naozaj chceš zmazať zoznam „${list.title}“?`);
    if (!ok) return;

    setBusyId(list.id);
    setError(null);
    try {
      await api.delete(`/lists/${list.id}`);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa zmazať zoznam.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((l) => l.title.toLowerCase().includes(q));
  }, [lists, query]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Moje nákupné zoznamy</h1>
            <p className="text-sm text-slate-500">
              Vytvor zoznam, pridávaj položky a označuj ich ako kúpené.
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Názov zoznamu (napr. Potraviny)"
              className="flex-1 md:w-72 rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <button
              onClick={createList}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
            >
              Vytvoriť
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="w-full md:w-72">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hľadať zoznam..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <button
            onClick={loadLists}
            className="text-sm px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 w-full md:w-auto"
          >
            Obnoviť
          </button>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Načítavam...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-slate-600">
            Zatiaľ nemáš žiadne zoznamy. Vytvor si prvý hore.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((list) => (
              <div
                key={list.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link to={`/lists/${list.id}`} className="block">
                    <div className="font-semibold text-slate-800 truncate">{list.title}</div>
                    <div className="text-xs text-slate-500">Klikni pre detail</div>
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/lists/${list.id}`}
                    className="text-sm px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Otvoriť
                  </Link>
                  <button
                    onClick={() => deleteList(list)}
                    disabled={busyId === list.id}
                    className="text-sm px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                    title="Zmazať zoznam"
                  >
                    {busyId === list.id ? "Mažem..." : "Zmazať"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
