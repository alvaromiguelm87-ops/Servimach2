import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilesTable, professionalsTable, ordersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOrCreateProfile } from "./users";

const router = Router();

router.get("/professionals", async (req, res) => {
  const { category, search, sortBy } = req.query as {
    category?: string;
    search?: string;
    sortBy?: string;
  };

  const rows = await db
    .select({
      id: professionalsTable.id,
      profileId: professionalsTable.profileId,
      profession: professionalsTable.profession,
      category: professionalsTable.category,
      description: professionalsTable.description,
      rating: professionalsTable.rating,
      reviewCount: professionalsTable.reviewCount,
      createdAt: professionalsTable.createdAt,
      name: profilesTable.name,
      whatsapp: profilesTable.whatsapp,
      location: profilesTable.location,
      authId: profilesTable.authId,
    })
    .from(professionalsTable)
    .innerJoin(profilesTable, eq(professionalsTable.profileId, profilesTable.id));

  const authIds = [...new Set(rows.map((r) => r.authId))];
  const authUsers = authIds.length > 0
    ? await db.select().from(usersTable)
    : [];
  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  let filtered = rows.map((p) => ({
    ...p,
    profilePhoto: authMap.get(p.authId)?.profileImageUrl ?? null,
  }));

  if (category && category !== "all") {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.profession.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  if (sortBy === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return res.json(
    filtered.map((p) => ({
      id: p.id,
      userId: p.profileId,
      replId: p.authId,
      name: p.name,
      profession: p.profession,
      category: p.category,
      description: p.description,
      location: p.location ?? "",
      profilePhoto: p.profilePhoto,
      whatsapp: p.whatsapp,
      rating: p.rating,
      reviewCount: p.reviewCount,
      createdAt: p.createdAt,
    }))
  );
});

router.get("/professionals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .select({
      id: professionalsTable.id,
      profileId: professionalsTable.profileId,
      profession: professionalsTable.profession,
      category: professionalsTable.category,
      description: professionalsTable.description,
      rating: professionalsTable.rating,
      reviewCount: professionalsTable.reviewCount,
      createdAt: professionalsTable.createdAt,
      name: profilesTable.name,
      whatsapp: profilesTable.whatsapp,
      location: profilesTable.location,
      authId: profilesTable.authId,
    })
    .from(professionalsTable)
    .innerJoin(profilesTable, eq(professionalsTable.profileId, profilesTable.id))
    .where(eq(professionalsTable.id, id));

  if (!row) return res.status(404).json({ error: "Not found" });

  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, row.authId));

  return res.json({
    id: row.id,
    userId: row.profileId,
    replId: row.authId,
    name: row.name,
    profession: row.profession,
    category: row.category,
    description: row.description,
    location: row.location ?? "",
    profilePhoto: authRec?.profileImageUrl ?? null,
    whatsapp: row.whatsapp,
    rating: row.rating,
    reviewCount: row.reviewCount,
    createdAt: row.createdAt,
  });
});

router.patch("/professionals/:id", async (req, res) => {
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

  const [prof] = await db
    .select()
    .from(professionalsTable)
    .where(eq(professionalsTable.id, id));
  if (!prof) return res.status(404).json({ error: "Not found" });

  if (prof.profileId !== profile.id && profile.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { profession, category, description, location, whatsapp } = req.body;
  const profUpdates: Record<string, unknown> = {};
  if (profession !== undefined) profUpdates.profession = profession;
  if (category !== undefined) profUpdates.category = category;
  if (description !== undefined) profUpdates.description = description;

  if (Object.keys(profUpdates).length > 0) {
    await db
      .update(professionalsTable)
      .set(profUpdates)
      .where(eq(professionalsTable.id, id));
  }

  const profileUpdates: Record<string, unknown> = {};
  if (location !== undefined) profileUpdates.location = location;
  if (whatsapp !== undefined) profileUpdates.whatsapp = whatsapp;
  if (Object.keys(profileUpdates).length > 0) {
    await db
      .update(profilesTable)
      .set(profileUpdates)
      .where(eq(profilesTable.id, prof.profileId));
  }

  const [updated] = await db
    .select({
      id: professionalsTable.id,
      profileId: professionalsTable.profileId,
      profession: professionalsTable.profession,
      category: professionalsTable.category,
      description: professionalsTable.description,
      rating: professionalsTable.rating,
      reviewCount: professionalsTable.reviewCount,
      createdAt: professionalsTable.createdAt,
      name: profilesTable.name,
      whatsapp: profilesTable.whatsapp,
      location: profilesTable.location,
      authId: profilesTable.authId,
    })
    .from(professionalsTable)
    .innerJoin(profilesTable, eq(professionalsTable.profileId, profilesTable.id))
    .where(eq(professionalsTable.id, id));

  return res.json({
    id: updated.id,
    userId: updated.profileId,
    replId: updated.authId,
    name: updated.name,
    profession: updated.profession,
    category: updated.category,
    description: updated.description,
    location: updated.location ?? "",
    profilePhoto: authRec?.profileImageUrl ?? null,
    whatsapp: updated.whatsapp,
    rating: updated.rating,
    reviewCount: updated.reviewCount,
    createdAt: updated.createdAt,
  });
});

router.get("/dashboard/professional", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const [prof] = await db
    .select()
    .from(professionalsTable)
    .where(eq(professionalsTable.profileId, profile.id));

  if (!prof) {
    return res.json({
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalEarnings: 0,
      platformCommission: 0,
      rating: 0,
      recentOrders: [],
    });
  }

  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.professionalProfileId, profile.id))
    .orderBy(desc(ordersTable.createdAt));

  const total = allOrders.length;
  const pending = allOrders.filter((o) => o.status === "pending").length;
  const completed = allOrders.filter((o) => o.status === "completed").length;
  const totalEarnings = allOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.professionalEarnings, 0);
  const platformCommission = allOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.commission, 0);

  return res.json({
    totalOrders: total,
    pendingOrders: pending,
    completedOrders: completed,
    totalEarnings,
    platformCommission,
    rating: prof.rating,
    recentOrders: allOrders.slice(0, 5).map((o) => ({
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
      clientName: null,
      professionalName: profile.name,
      professionalProfession: prof.profession,
    })),
  });
});

export default router;
