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

/*
 * PERFIL DO UTILIZADOR AUTENTICADO
 */
router.get("/users/me", async (req, res) => {
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

/*
 * ATUALIZAR PERFIL
 */
router.patch("/users/me", async (req, res) => {
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
      authRec?.email?.split("@")[0] ||
      "User",
    authRec?.email,
  );

  const {
    name,
    role,
    whatsapp,
    location,
    profession,
    category,
    description,
  } = req.body;

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (name !== undefined) {
    updates.name = name;
  }

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

  /*
   * Se virar profissional,
   * cria ou atualiza o perfil profissional.
   */
  if (role === "professional") {
    const existingProfessional = await db
      .select()
      .from(professionalsTable)
      .where(
        eq(
          professionalsTable.profileId,
          updated.id,
        ),
      );

    if (existingProfessional.length === 0) {
      await db.insert(professionalsTable).values({
        profileId: updated.id,
        profession:
          profession || "Profissional",
        category: category || "Outros",
        description:
          description || "",
      });
    } else {
      await db
        .update(professionalsTable)
        .set({
          profession:
            profession ??
            existingProfessional[0].profession,

          category:
            category ??
            existingProfessional[0].category,

          description:
            description ??
            existingProfessional[0].description,

          updatedAt: new Date(),
        })
        .where(
          eq(
            professionalsTable.profileId,
            updated.id,
          ),
        );
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

/*
 * DASHBOARD DO CLIENTE
 */
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
      authRec?.email?.split("@")[0] ||
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

  const totalOrders = allOrders.length;

  const activeOrders = allOrders.filter((o) =>
    ["pending", "accepted"].includes(
      o.status,
    ),
  ).length;

  const completedOrders = allOrders.filter(
    (o) => o.status === "completed",
  ).length;

  const totalSpent = allOrders
    .filter((o) => o.status === "completed")
    .reduce(
      (sum, order) => sum + order.price,
      0,
    );

  return res.json({
    totalOrders,
    activeOrders,
    completedOrders,
    totalSpent,

    recentOrders: allOrders
      .slice(0, 5)
      .map((order) => ({
        id: order.id,
        clientId:
          order.clientProfileId,

        professionalId:
          order.professionalProfileId,

        description:
          order.description,

        price: order.price,

        commission:
          order.commission,

        professionalEarnings:
          order.professionalEarnings,

        status: order.status,

        paymentStatus:
          order.paymentStatus,

        paymentMethod:
          order.paymentMethod,

        transactionId:
          order.transactionId,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,

        clientName:
          profile.name,

        professionalName:
          "Profissional",

        professionalProfession:
          "Serviço",
      })),
  });
});

export default router;
