import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, profilesTable, professionalsTable, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOrCreateProfile } from "./users";

const router = Router();

router.post("/reviews", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const authUser = req.user!;
  const [authRec] = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id));
  const profile = await getOrCreateProfile(
    authUser.id,
    `${authRec?.firstName ?? ""} ${authRec?.lastName ?? ""}`.trim() || "User",
    authRec?.email
  );

  const { orderId, professionalId, rating, comment } = req.body;
  if (!orderId || !professionalId || !rating) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      orderId,
      clientProfileId: profile.id,
      professionalProfileId: professionalId,
      rating,
      comment,
    })
    .returning();

  const allReviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.professionalProfileId, professionalId));

  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db
    .update(professionalsTable)
    .set({ rating: avgRating, reviewCount: allReviews.length })
    .where(eq(professionalsTable.profileId, professionalId));

  return res.status(201).json({
    id: review.id,
    orderId: review.orderId,
    clientId: review.clientProfileId,
    professionalId: review.professionalProfileId,
    rating: review.rating,
    comment: review.comment,
    clientName: profile.name,
    clientPhoto: authRec?.profileImageUrl ?? null,
    createdAt: review.createdAt,
  });
});

router.get("/reviews/professional/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const reviews = await db
    .select({
      id: reviewsTable.id,
      orderId: reviewsTable.orderId,
      clientProfileId: reviewsTable.clientProfileId,
      professionalProfileId: reviewsTable.professionalProfileId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      clientName: profilesTable.name,
      clientAuthId: profilesTable.authId,
    })
    .from(reviewsTable)
    .innerJoin(profilesTable, eq(reviewsTable.clientProfileId, profilesTable.id))
    .where(eq(reviewsTable.professionalProfileId, id))
    .orderBy(reviewsTable.createdAt);

  const authIds = [...new Set(reviews.map((r) => r.clientAuthId))];
  const authUsers = authIds.length > 0 ? await db.select().from(usersTable) : [];
  const authMap = new Map(authUsers.map((u) => [u.id, u]));

  return res.json(
    reviews.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      clientId: r.clientProfileId,
      professionalId: r.professionalProfileId,
      rating: r.rating,
      comment: r.comment,
      clientName: r.clientName,
      clientPhoto: authMap.get(r.clientAuthId)?.profileImageUrl ?? null,
      createdAt: r.createdAt,
    }))
  );
});

export default router;
