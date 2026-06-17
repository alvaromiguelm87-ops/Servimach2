import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  profilesTable,
  professionalsTable,
  ordersTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

async function getOrCreateProfile(
  authId: string,
  name: string,
  email: string | null | undefined,
) {
  let [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.authId, authId));

  if (!profile) {
    [profile] = await db
      .insert(profilesTable)
      .values({
        authId,
        name,
        role: "client",
        whatsapp: "",
        location: "",
      })
      .returning();
  }

  return profile;
}

export { getOrCreateProfile };

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const authUser = req.user!;

  const [authRec] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, authUser.id));

  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() ||
      authRec?.email?.split("@")[0] ||
      "User",
    authRec?.email,
  );

  return res.json({
    id: profile.id,
    replId: profile.authId,
    name: profile.name,
    email: authRec?.email ?? null,
    role: profile.role,
    profilePhoto: authRec?.profileImageUrl ?? null,
    whatsapp: profile.whatsapp,
    location: profile.location,
    createdAt: profile.createdAt,
  });
});

router.patch("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const authUser = req.user!;

  const [authRec] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, authUser.id));

  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() ||
      "User",
    authRec?.email,
  );

  const { name, role, whatsapp, location } = req.body;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) updates.name = name;

  if (
    role !== undefined &&
    ["client", "professional"].includes(role)
  ) {
    updates.role = role;
  }

  if (whatsapp !== undefined) {
    updates.whatsapp = whatsapp;
  }

  if (location !== undefined) {
    updates.location = location;
  }

  const [updated] = await db
    .update(profilesTable)
    .set(updates)
    .where(eq(profilesTable.id, profile.id))
    .returning();

  if (role === "professional") {
    const existing = await db
      .select()
      .from(professionalsTable)
      .where(
        eq(professionalsTable.profileId, updated.id),
      );

    if (existing.length === 0) {
      await db.insert(professionalsTable).values({
        profileId: updated.id,
        profession: "Profissional",
        category: "Outros",
      });
    }
  }

  return res.json({
    id: updated.id,
    replId: updated.authId,
    name: updated.name,
    email: authRec?.email ?? null,
    role: updated.role,
    profilePhoto: authRec?.profileImageUrl ?? null,
    whatsapp: updated.whatsapp,
    location: updated.location,
    createdAt: updated.createdAt,
  });
});

router.get("/dashboard/client", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  const authUser = req.user!;

  const [authRec] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, authUser.id));

  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() ||
      "User",
    authRec?.email,
  );

  const allOrders = await db
    .select()
    .from(ordersTable)
    .where(
      eq(
        ordersTable.clientProfileId,
        profile.id,
      ),
    )
    .orderBy(desc(ordersTable.createdAt));

  const total = allOrders.length;

  const active = allOrders.filter((o) =>
    ["pending", "accepted"].includes(
      o.status,
    ),
  ).length;

  const completed = allOrders.filter(
    (o) => o.status === "completed",
  ).length;

  const totalSpent = allOrders
    .filter((o) => o.status === "completed")
    .reduce(
      (sum, o) => sum + o.price,
      0,
    );

  return res.json({
    totalOrders: total,
    activeOrders: active,
    completedOrders: completed,
    totalSpent,

    recentOrders: allOrders
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        clientId: o.clientProfileId,
        professionalId:
          o.professionalProfileId,
        description: o.description,
        price: o.price,
        commission: o.commission,
        professionalEarnings:
          o.professionalEarnings,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        transactionId: o.transactionId,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,

        clientName: profile.name,

        professionalName:
          "Profissional",

        professionalProfession:
          "Serviço",
      })),
  });
});

export default router;
