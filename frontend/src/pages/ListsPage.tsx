import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ShoppingList = {
  id: string;
  title: string;
  isArchived: boolean;
  shareToken?: string | null;
};

export default function ListsPage() {
  const nav = useNavigate();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lists;
    return lists.filter((l) => l.title.toLowerCase().includes(q));
  }, [lists, query]);

  const createList = async () => {
    const name = title.trim();
    if (!name) return;

    setError(null);
    try {
      const res = await api.post<ShoppingList>("/lists", { title: name });
      setTitle("");
      // pridaj hore v UI (okamžitá odozva)
      setLists((prev) => [res.data, ...prev]);
      // a rovno otvor detail
      nav(`/lists/${res.data.id}`);
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

  const persistOrder = async (nextLists: ShoppingList[]) => {
    setSavingOrder(true);
    setError(null);
    try {
      await api.put("/lists/reorder", { ids: nextLists.map((l) => l.id) });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Nepodarilo sa uložiť poradie.");
      // ak failne, natiahni späť zo servera
      await loadLists();
    } finally {
      setSavingOrder(false);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Pozor: dragujeme len v "filtered" zobrazení by to komplikovalo.
    // Preto drag povoľujeme iba keď nefiltruješ (query prázdne).
    if (query.trim()) {
      setError("Presúvanie funguje iba bez vyhľadávania (vymaž filter).");
      return;
    }

    setLists((prev) => {
      const oldIndex = prev.findIndex((x) => x.id === active.id);
      const newIndex = prev.findIndex((x) => x.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      // uložiť na backend (async)
      void persistOrder(next);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Moje nákupné zoznamy</h1>
            <p className="text-sm text-slate-500">
              Podrž „⋮⋮“ a presuň zoznam. Zmeny sa uložia automaticky.
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Názov (napr. Potraviny)"
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
              placeholder="Hľadať..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadLists}
              className="text-sm px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Obnoviť
            </button>
            {savingOrder && (
              <div className="text-sm px-3 py-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
                Ukladám poradie…
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Načítavam…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-slate-600">
          Zatiaľ nemáš žiadne zoznamy.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filtered.map((list) => (
                <SortableListRow
                  key={list.id}
                  list={list}
                  busy={busyId === list.id}
                  onDelete={() => deleteList(list)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableListRow({
  list,
  busy,
  onDelete,
}: {
  list: ShoppingList;
  busy: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3 ${
        isDragging ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
          title="Podrž a presuň"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>

        <div className="min-w-0">
          <Link to={`/lists/${list.id}`} className="block">
            <div className="font-semibold text-slate-800 truncate">{list.title}</div>
            <div className="text-xs text-slate-500">Otvoriť detail</div>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/lists/${list.id}`}
          className="text-sm px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
        >
          Otvoriť
        </Link>
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-sm px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {busy ? "Mažem…" : "Zmazať"}
        </button>
      </div>
    </div>
  );
}
