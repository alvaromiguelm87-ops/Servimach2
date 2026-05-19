import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilesTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateProfile } from "./users";

const router = Router();

router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.profileId, profile.id))
    .orderBy(desc(notificationsTable.createdAt));

  return res.json(
    notifications.map((n) => ({
      id: n.id,
      userId: n.profileId,
      message: n.message,
      type: n.type,
      read: n.read === "true",
      createdAt: n.createdAt,
    }))
  );
});

router.patch("/notifications/:id/read", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [updated] = await db
    .update(notificationsTable)
    .set({ read: "true" })
    .where(eq(notificationsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({
    id: updated.id,
    userId: updated.profileId,
    message: updated.message,
    type: updated.type,
    read: updated.read === "true",
    createdAt: updated.createdAt,
  });
});

export default router;
