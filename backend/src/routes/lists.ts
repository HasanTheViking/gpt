import { Router } from "express";
import prisma from "../prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /lists
 * Vráti všetky zoznamy používateľa zoradené podľa position ASC.
 */
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const lists = await prisma.shoppingList.findMany({
    where: { userId, isArchived: false },
    orderBy: { position: "asc" },
    include: { items: true }
  });
  res.json(lists);
});

/**
 * POST /lists
 * Vytvorí nový zoznam na konci (position = max + 1).
 * Body: { title: string }
 */
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const title = String(req.body?.title ?? "").trim();

  if (!title) return res.status(400).json({ message: "Názov zoznamu je povinný" });

  const last = await prisma.shoppingList.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true }
  });

  const position = (last?.position ?? -1) + 1;

  const created = await prisma.shoppingList.create({
    data: { title, userId, position }
  });

  res.status(201).json(created);
});

/**
 * PUT /lists/reorder
 * Body: { ids: string[] }
 * Uloží poradie podľa indexu v poli.
 */
router.put("/reorder", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const ids = req.body?.ids as unknown;

  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) {
    return res.status(400).json({ message: "ids musí byť pole stringov" });
  }

  await prisma.$transaction(
    ids.map((listId, index) =>
      prisma.shoppingList.updateMany({
        where: { id: listId, userId },
        data: { position: index }
      })
    )
  );

  res.json({ ok: true });
});

/**
 * GET /lists/:id
 * Detail zoznamu (vrátane items).
 */
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = req.params.id;

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId },
    include: { items: true }
  });

  if (!list) return res.status(404).json({ message: "Zoznam sa nenašiel" });
  res.json(list);
});

/**
 * DELETE /lists/:id
 * Zmaže zoznam (a vďaka cascade aj položky).
 */
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const id = req.params.id;

  const existing = await prisma.shoppingList.findFirst({
    where: { id, userId },
    select: { id: true }
  });

  if (!existing) return res.status(404).json({ message: "Zoznam sa nenašiel" });

  await prisma.shoppingList.delete({ where: { id } });

  res.json({ ok: true });
});

export default router;
