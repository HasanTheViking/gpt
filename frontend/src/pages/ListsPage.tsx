import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

type ShoppingList = {
  id: string;
  title: string;
  isArchived: boolean;
  shareToken: string | null;
};

export default function ListsPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLists = async () => {
    try {
      setLoading(true);
      const res = await api.get<ShoppingList[]>("/lists");
      setLists(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists();
  }, []);

  const createList = async () => {
    if (!title.trim()) return;
    const res = await api.post<ShoppingList>("/lists", { title });
    setLists((prev) => [res.data, ...prev]);
    setTitle("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="New list name (e.g., Groceries, BBQ Party...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={createList}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          Create
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading ? (
        <div>Loading lists...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {lists.map((list) => (
            <Link
              to={`/lists/${list.id}`}
              key={list.id}
              className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{list.title}</h3>
                  <p className="text-sm text-slate-500">
                    Share code: <span className="font-mono">{list.shareToken ?? "—"}</span>
                  </p>
                </div>
                {list.isArchived && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    Archived
                  </span>
                )}
              </div>
            </Link>
          ))}
          {lists.length === 0 && (
            <div className="text-slate-600">Create your first list to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
