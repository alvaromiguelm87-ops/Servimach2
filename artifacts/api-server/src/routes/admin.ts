import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilesTable, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateProfile } from "./users";

const router = Router();

async function requireAdmin(req: any, res: any) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );
  if (profile.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return profile;
}

router.get("/admin/stats", async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const allProfiles = await db.select().from(profilesTable);
  const allOrders = await db.select().from(ordersTable);

  const totalUsers = allProfiles.length;
  const totalProfessionals = allProfiles.filter((p) => p.role === "professional").length;
  const totalClients = allProfiles.filter((p) => p.role === "client").length;
  const totalOrders = allOrders.length;
  const completedOrders = allOrders.filter((o) => o.status === "completed").length;
  const pendingOrders = allOrders.filter((o) => o.status === "pending").length;
  const totalRevenue = allOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.price, 0);
  const platformEarnings = allOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.commission, 0);

  return res.json({
    totalUsers,
    totalProfessionals,
    totalClients,
    totalOrders,
    completedOrders,
    pendingOrders,
    totalRevenue,
    platformEarnings,
  });
});

router.get("/admin/users", async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const profiles = await db.select().from(profilesTable);
  const authUsers = await db.select().from(usersTable);
  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  return res.json(
    profiles.map((p) => ({
      id: p.id,
      replId: p.authId,
      name: p.name,
      email: authMap.get(p.authId)?.email ?? null,
      role: p.role,
      profilePhoto: authMap.get(p.authId)?.profileImageUrl ?? null,
      whatsapp: p.whatsapp,
      location: p.location,
      createdAt: p.createdAt,
    }))
  );
});

router.get("/admin/orders", async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const allOrders = await db.select().from(ordersTable);
  const allProfiles = await db.select().from(profilesTable);
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  return res.json(
    allOrders.map((o) => ({
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
      clientName: profileMap.get(o.clientProfileId)?.name ?? null,
      professionalName: profileMap.get(o.professionalProfileId)?.name ?? null,
      professionalProfession: null,
    }))
  );
});

export default router;
