import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma";
import { env } from "../config/env";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: "7d" });

  res.json({ token, user: { id: user.id, email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, email: user.email });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
