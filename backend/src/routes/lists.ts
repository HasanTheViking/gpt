import { Router } from "express";
import { nanoid } from "nanoid";
import { prisma } from "../config/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const lists = await prisma.shoppingList.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json(lists);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: "Title is required" });
  const list = await prisma.shoppingList.create({
    data: { title, userId: req.userId!, shareToken: nanoid(10) }
  });
  res.status(201).json(list);
});

router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  const list = await prisma.shoppingList.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { items: { orderBy: { createdAt: "desc" } } }
  });
  if (!list) return res.status(404).json({ message: "List not found" });
  res.json(list);
});

router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const { title, isArchived } = req.body;
  const list = await prisma.shoppingList.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: { title, isArchived }
  });
  if (list.count === 0) return res.status(404).json({ message: "List not found" });
  const updated = await prisma.shoppingList.findUnique({ where: { id: req.params.id } });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  await prisma.item.deleteMany({ where: { listId: req.params.id } });
  const deleted = await prisma.shoppingList.deleteMany({
    where: { id: req.params.id, userId: req.userId }
  });
  if (deleted.count === 0) return res.status(404).json({ message: "List not found" });
  res.status(204).send();
});

// DELETE /lists/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const id = req.params.id;

  const list = await prisma.shoppingList.findFirst({
    where: { id, userId }
  });

  if (!list) return res.status(404).json({ message: "Zoznam sa nenašiel" });

  await prisma.item.deleteMany({ where: { listId: id } });
  await prisma.shoppingList.delete({ where: { id } });

  res.json({ ok: true });
});


// Public read-only access via shareToken
router.get("/shared/:shareToken", async (req, res) => {
  const list = await prisma.shoppingList.findUnique({
    where: { shareToken: req.params.shareToken },
    include: { items: true }
  });
  if (!list) return res.status(404).json({ message: "List not found" });
  res.json({ id: list.id, title: list.title, items: list.items });
});

export default router;
