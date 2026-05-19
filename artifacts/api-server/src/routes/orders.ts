import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilesTable, ordersTable, notificationsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { getOrCreateProfile } from "./users";

const router = Router();

function mapOrder(o: typeof ordersTable.$inferSelect, clientName: string | null, profName: string | null, profProfession: string | null) {
  return {
    id: o.id,
    clientId: o.clientProfileId,
    professionalId: o.professionalProfileId,
    description: o.description,
    price: o.price,
    commission: o.commission,
    professionalEarnings: o.professionalEarnings,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    transactionId: o.transactionId,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    clientName,
    professionalName: profName,
    professionalProfession: profProfession,
  };
}

router.get("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const { status } = req.query as { status?: string };

  let rows;
  if (profile.role === "admin") {
    rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
  } else if (profile.role === "professional") {
    rows = await db
      .select()
      .from(ordersTable)
      .where(or(eq(ordersTable.professionalProfileId, profile.id), eq(ordersTable.clientProfileId, profile.id)))
      .orderBy(desc(ordersTable.createdAt));
  } else {
    rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.clientProfileId, profile.id))
      .orderBy(desc(ordersTable.createdAt));
  }

  if (status) {
    rows = rows.filter((o) => o.status === status);
  }

  const allProfileIds = [...new Set([...rows.map((o) => o.clientProfileId), ...rows.map((o) => o.professionalProfileId)])];
  const profiles = allProfileIds.length > 0
    ? await db.select().from(profilesTable)
    : [];
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return res.json(
    rows.map((o) => mapOrder(
      o,
      profileMap.get(o.clientProfileId)?.name ?? null,
      profileMap.get(o.professionalProfileId)?.name ?? null,
      null
    ))
  );
});

router.post("/orders", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const { professionalId, description, price } = req.body;
  if (!professionalId || !description || price == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const commission = price * 0.1;
  const professionalEarnings = price - commission;

  const [order] = await db
    .insert(ordersTable)
    .values({
      clientProfileId: profile.id,
      professionalProfileId: professionalId,
      description,
      price,
      commission,
      professionalEarnings,
      status: "pending",
      paymentStatus: "pending",
    })
    .returning();

  await db.insert(notificationsTable).values({
    profileId: professionalId,
    message: `Novo pedido de serviço recebido de ${profile.name}`,
    type: "order_received",
  });

  const [profProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, professionalId));

  return res.status(201).json(mapOrder(order, profile.name, profProfile?.name ?? null, null));
});

router.get("/orders/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return res.status(404).json({ error: "Not found" });

  if (
    profile.role !== "admin" &&
    order.clientProfileId !== profile.id &&
    order.professionalProfileId !== profile.id
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [clientP] = await db.select().from(profilesTable).where(eq(profilesTable.id, order.clientProfileId));
  const [profP] = await db.select().from(profilesTable).where(eq(profilesTable.id, order.professionalProfileId));

  return res.json(mapOrder(order, clientP?.name ?? null, profP?.name ?? null, null));
});

router.patch("/orders/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return res.status(404).json({ error: "Not found" });

  if (profile.role !== "admin" && order.professionalProfileId !== profile.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { status, paymentStatus, paymentMethod, transactionId } = req.body;
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
  if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
  if (transactionId !== undefined) updates.transactionId = transactionId;

  const [updated] = await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, id))
    .returning();

  if (status === "accepted") {
    await db.insert(notificationsTable).values({
      profileId: order.clientProfileId,
      message: `O seu pedido de serviço foi aceite!`,
      type: "order_accepted",
    });
  } else if (status === "rejected") {
    await db.insert(notificationsTable).values({
      profileId: order.clientProfileId,
      message: `O seu pedido de serviço foi recusado.`,
      type: "order_rejected",
    });
  } else if (status === "completed") {
    await db.insert(notificationsTable).values({
      profileId: order.clientProfileId,
      message: `O seu pedido foi marcado como concluído!`,
      type: "order_completed",
    });
  }

  const [clientP] = await db.select().from(profilesTable).where(eq(profilesTable.id, updated.clientProfileId));
  const [profP] = await db.select().from(profilesTable).where(eq(profilesTable.id, updated.professionalProfileId));

  return res.json(mapOrder(updated, clientP?.name ?? null, profP?.name ?? null, null));
});

export default router;
