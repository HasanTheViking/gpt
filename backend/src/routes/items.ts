import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { env } from "../config/env";

const router = Router();

router.post("/lists/:id/items", requireAuth, async (req: AuthRequest, res) => {
  const { name, quantity, unit, category } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const list = await prisma.shoppingList.findFirst({
    where: { id: req.params.id, userId: req.userId }
  });
  if (!list) return res.status(404).json({ message: "List not found" });

  const item = await prisma.item.create({
    data: {
      name,
      quantity: quantity ?? 1,
      unit: unit || "pcs",
      category: category || "other",
      listId: list.id
    }
  });
  res.status(201).json(item);
});

router.put("/items/:id", requireAuth, async (req: AuthRequest, res) => {
  const { name, quantity, unit, category, isBought } = req.body;

  const item = await prisma.item.findFirst({
    where: { id: req.params.id, list: { userId: req.userId } }
  });
  if (!item) return res.status(404).json({ message: "Item not found" });

  const now = new Date();
  const updated = await prisma.item.update({
    where: { id: item.id },
    data: {
      name: name ?? item.name,
      quantity: quantity ?? item.quantity,
      unit: unit ?? item.unit,
      category: category ?? item.category,
      isBought: typeof isBought === "boolean" ? isBought : item.isBought,
      lastBoughtAt: isBought ? now : item.lastBoughtAt
    }
  });

  if (isBought) {
    await prisma.itemStats.upsert({
      where: {
        userId_name: {
          userId: req.userId!,
          name: updated.name
        }
      },
      update: {
        timesBought: { increment: 1 },
        lastBoughtAt: now
      },
      create: {
        userId: req.userId!,
        name: updated.name,
        timesBought: 1,
        lastBoughtAt: now
      }
    });
  }

  res.json(updated);
});

router.delete("/items/:id", requireAuth, async (req: AuthRequest, res) => {
  const deleted = await prisma.item.deleteMany({
    where: { id: req.params.id, list: { userId: req.userId } }
  });
  if (deleted.count === 0) return res.status(404).json({ message: "Item not found" });
  res.status(204).send();
});

// Suggestions endpoint
router.get("/suggestions", requireAuth, async (req: AuthRequest, res) => {
  const now = new Date();
  const stats = await prisma.itemStats.findMany({ where: { userId: req.userId } });

  const suggestions = stats
    .filter((stat) => {
      if (stat.timesBought < env.suggestion.frequentThreshold) return false;
      if (!stat.lastBoughtAt) return false;
      const diffDays =
        (now.getTime() - stat.lastBoughtAt.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= (stat.avgBuyIntervalDays ?? env.suggestion.defaultIntervalDays);
    })
    .map((stat) => ({
      name: stat.name,
      lastBoughtAt: stat.lastBoughtAt,
      timesBought: stat.timesBought
    }));

  res.json({ suggestions });
});

export default router;
