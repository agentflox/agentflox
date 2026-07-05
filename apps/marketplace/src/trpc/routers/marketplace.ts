import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/services/billing.service";
import { TRPCError } from "@trpc/server";

async function assertSubscribed(userId: string, session: any) {
  const response = await billingService.subscriptions.getCurrent(userId, session);
  const subscription = await response.json();
  if (!subscription || subscription.plan?.planType === "FREE") {
    throw new Error("Advanced AI matching is available for paid plans only");
  }
}

const listingTypeInputSchema = z.enum([
  "task",
  "project",
  "agent",
  "tool",
  "template",
  "talent",
  "team",
  "dataset",
  "integration",
  "workflow",
  "workforce",
]);

const LISTING_TYPE_MAP: Record<string, string> = {
  task: "TASK",
  project: "PROJECT",
  agent: "AGENT",
  tool: "TOOL",
  template: "TEMPLATE",
  talent: "TALENT",
  team: "TEAM",
  dataset: "DATASET",
  integration: "INTEGRATION",
  workflow: "WORKFLOW",
  workforce: "WORKFORCE",
};

function toDbListingType(input: string) {
  return LISTING_TYPE_MAP[input] ?? "TEMPLATE";
}

function normalizeListing(listing: any) {
  return {
    ...listing,
    type: String(listing.type || "").toLowerCase(),
    status: String(listing.status || "").toLowerCase(),
    applicationSchema: listing.applicationSchema ?? null,
    attachmentUrls: Array.isArray(listing.previewImages) ? listing.previewImages : [],
    applyCount: listing._count?.applications ?? listing.applyCount ?? 0,
    commentCount: listing.commentCount ?? 0,
    ratings: {
      average: Number(listing.ratingAvg ?? 0),
      totalReviews: Number(listing.ratingCount ?? 0),
      quality: Number(listing.ratingAvg ?? 0),
      communication: Number(listing.ratingAvg ?? 0),
      delivery: Number(listing.ratingAvg ?? 0),
    },
  };
}

function makeSlugBase(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "listing";
}

async function generateUniqueSlug(title: string) {
  const base = makeSlugBase(title);
  const existing = await prisma.marketplaceListing.findUnique({
    where: { slug: base },
    select: { id: true },
  });
  if (!existing) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    const match = await prisma.marketplaceListing.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!match) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function validateProposalAnswers(applicationSchema: any, answers: Record<string, unknown>) {
  const fields = Array.isArray(applicationSchema?.fields) ? applicationSchema.fields : [];
  for (const field of fields) {
    if (!field?.required) continue;
    const value = answers[field.id];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Missing required field: ${field.label || field.id}`,
      });
    }
  }
}

async function ensureProposalConversation(userA: string, userB: string, marketplaceListingId: string | null = null) {
  const participantIds = [userA, userB].sort();
  let conversation = await prisma.conversation.findFirst({
    where: { 
      participantIds: { equals: participantIds },
      marketplaceListingId,
    },
    select: { id: true },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { 
        participantIds,
        marketplaceListingId,
      },
      select: { id: true },
    });
  }
  return conversation.id;
}

async function createProposalSystemMessage(params: {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
}) {
  const { conversationId, senderId, receiverId, content } = params;
  const last = await prisma.message.findFirst({
    where: { conversationId, senderId, receiverId },
    orderBy: { createdAt: "desc" },
    select: { content: true, createdAt: true },
  });
  if (last?.content === content) return;
  await prisma.message.create({
    data: {
      conversationId,
      senderId,
      receiverId,
      content,
      attachments: [],
      deliveryStatus: "PERSISTED",
    },
  });
}

async function createProposalStatusNotification(params: {
  userId: string;
  title: string;
  content: string;
  listingId: string;
}) {
  const { userId, title, content, listingId } = params;
  await prisma.notification.create({
    data: {
      userId,
      type: "REQUEST_STATUS",
      title,
      message: content,
      actorIds: [],
      entityType: "MARKETPLACE_LISTING",
      entityId: listingId,
      metadata: {},
      aggregateKey: `marketplace_listing:${listingId}:request_status`,
    },
  });
}

export const marketplaceRouter = router({
  publishListing: protectedProcedure
    .input(
      z.object({
        listingId: z.string().optional(),
        title: z.string().min(1).max(200),
        description: z.string().min(1),
        type: listingTypeInputSchema,
        category: z.union([z.string(), z.array(z.string())]).optional(),
        tags: z.array(z.string()).optional().default([]),
        pricingType: z.enum(["free", "paid"]).default("free"),
        pricingModel: z.enum(["fixed", "hourly"]).optional(),
        priceCredits: z.number().int().min(1).optional(),
        price: z.number().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        coverImage: z.string().optional(),
        attachmentUrls: z.array(z.string()).optional().default([]),
        allowClone: z.boolean().default(true),
        allowRepublish: z.boolean().default(false),
        workspaceId: z.string().optional(),
        spaceId: z.string().optional(),
        projectId: z.string().optional(),
        teamId: z.string().optional(),
        applicationSchema: z
          .object({
            fields: z
              .array(
                z.object({
                  id: z.string(),
                  type: z.string(),
                  label: z.string(),
                  required: z.boolean().optional(),
                  placeholder: z.string().optional(),
                  description: z.string().optional(),
                  options: z.array(z.string()).optional(),
                })
              )
              .optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      // Normalise category — accept both string and string[]
      const categoryValue = Array.isArray(input.category)
        ? (input.category.length > 0 ? input.category.join(",") : null)
        : (input.category ?? null);
      const data: any = {
        title: input.title.trim(),
        description: input.description,
        type: toDbListingType(input.type) as any,
        category: categoryValue,
        tags: input.tags ?? [],
        isFree: input.pricingType === "free",
        priceCredits: input.pricingType === "paid" ? input.priceCredits ?? 1 : null,
        pricingModel: input.pricingType === "paid" ? (input.pricingModel ?? "fixed") : null,
        coverImage: input.coverImage ?? null,
        previewImages: input.attachmentUrls ?? [],
        allowClone: input.allowClone,
        allowRepublish: input.allowRepublish,
        applicationSchema: input.applicationSchema ?? null,
        status: "ACTIVE",
      };

      let listing: any;
      if (input.listingId) {
        listing = await prisma.marketplaceListing.update({
          where: { id: input.listingId, authorId: userId },
          data,
          include: {
            author: { select: { id: true, name: true, isVerified: true } },
            _count: { select: { applications: true, orders: true } },
          },
        });
      } else {
        const slug = await generateUniqueSlug(input.title);
        listing = await prisma.marketplaceListing.create({
          data: {
            ...data,
            slug,
            authorId: userId,
          } as any,
          include: {
            author: { select: { id: true, name: true, isVerified: true } },
            _count: { select: { applications: true, orders: true } },
          },
        });
      }

      return normalizeListing(listing);
    }),

  listRecent: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const listings = await prisma.marketplaceListing.findMany({
        where: { status: "ACTIVE" },
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, isVerified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
      return listings.map(normalizeListing);
    }),

  myListings: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session!.user!.id;
      const listings = await prisma.marketplaceListing.findMany({
        where: { authorId: me },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { applications: true, orders: true } },
          author: { select: { id: true, name: true, isVerified: true } },
        },
      });
      return listings.map(normalizeListing);
    }),

  searchListings: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.string().optional(),
      isFree: z.boolean().optional(),
      sortBy: z.enum(['latest', 'oldest', 'popular', 'likes']).optional().default('latest'),
      limit: z.number().int().min(1).max(50).default(20)
    }))
    .query(async ({ input }) => {
      const where: any = { status: "ACTIVE" };

      if (input.query) {
        where.title = { contains: input.query, mode: 'insensitive' };
      }

      if (input.type && input.type !== 'all') {
        where.type = toDbListingType(input.type);
      }

      if (input.isFree === true) {
        where.priceCredits = 0;
      } else if (input.isFree === false) {
        where.priceCredits = { gt: 0 };
      }

      let orderBy: any = { createdAt: 'desc' };
      if (input.sortBy === 'oldest') orderBy = { createdAt: 'asc' };
      if (input.sortBy === 'popular') orderBy = { orders: { _count: 'desc' } };
      if (input.sortBy === 'likes') orderBy = { applications: { _count: 'desc' } };

      const listings = await prisma.marketplaceListing.findMany({
        where,
        take: input.limit,
        orderBy,
        include: {
          author: { select: { id: true, name: true, isVerified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
      return listings.map(normalizeListing);
    }),

  myEarnings: protectedProcedure
    .query(async ({ ctx }) => {
      const me = ctx.session!.user!.id;
      const earnings = await prisma.earning.findMany({
        where: { userId: me },
        orderBy: { createdAt: 'desc' },
        include: {
          listing: { select: { title: true, type: true } },
        },
      });

      const totalCredits = earnings.reduce((acc, curr) => acc + curr.amountCredits, 0);

      return {
        totalCredits,
        history: earnings,
      };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, name: true, isVerified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
      if (!listing) throw new Error("Listing not found");
      return normalizeListing(listing);
    }),

  applyToListing: protectedProcedure
    .input(
      z.object({
        listingId: z.string(),
        pitch: z.string().min(1),
        targetRate: z.string().optional(),
        estimatedDuration: z.string().optional(),
        proposalText: z.string().optional(),
        answers: z.record(z.string(), z.unknown()).optional().default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.listingId },
        select: { id: true, authorId: true, status: true, title: true, description: true, slug: true, applicationSchema: true },
      });
      if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
      if (listing.authorId === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot apply to your own listing" });
      }
      if (listing.status !== "ACTIVE") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Listing is not accepting applications" });
      }

      const existingApplication = await prisma.marketplaceApplication.findFirst({
        where: { listingId: input.listingId, applicantId: userId },
        select: { id: true },
      });
      if (existingApplication) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You have already applied to this listing.",
        });
      }

      const submissionSchema = listing.applicationSchema as any;
      validateProposalAnswers(submissionSchema, input.answers);

      // Map answer IDs to their human-readable labels for better display in messages
      const labeledAnswers: Record<string, { label: string, value: any }> = {};
      if (submissionSchema?.sections) {
        submissionSchema.sections.forEach((section: any) => {
          section.fields?.forEach((field: any) => {
            if (field.id in input.answers) {
              labeledAnswers[field.id] = {
                label: field.label || field.name || field.id,
                value: (input.answers as any)[field.id]
              };
            }
          });
        });
      } else if (submissionSchema?.fields) {
        submissionSchema.fields.forEach((field: any) => {
          if (field.id in input.answers) {
            labeledAnswers[field.id] = {
              label: field.label || field.name || field.id,
              value: (input.answers as any)[field.id]
            };
          }
        });
      } else {
        // Fallback for flat schemas
        Object.entries(input.answers).forEach(([id, val]) => {
          labeledAnswers[id] = { label: id, value: val };
        });
      }

      const application = await prisma.marketplaceApplication.create({
        data: {
          listingId: input.listingId,
          applicantId: userId,
          pitch: input.pitch,
          targetRate: input.targetRate,
          estimatedDuration: input.estimatedDuration,
          proposalText: input.proposalText,
          answers: input.answers as any,
          provisioningStatus: "pending",
        },
      });

      const conversationId = await ensureProposalConversation(listing.authorId, userId, listing.id);
      const systemPayload = {
        type: "marketplace_submission",
        listing: {
          id: listing.id,
          slug: listing.slug,
          title: listing.title,
          description: listing.description,
        },
        application: {
          id: application.id,
          answers: labeledAnswers, // Send labeled answers for display
          pitch: input.pitch,
          targetRate: input.targetRate,
          estimatedDuration: input.estimatedDuration,
          createdAt: application.createdAt,
        },
      };
      await createProposalSystemMessage({
        conversationId,
        senderId: userId,
        receiverId: listing.authorId,
        content: `__AF_MARKETPLACE_SUBMISSION__${JSON.stringify(systemPayload)}`,
      });
      await createProposalStatusNotification({
        userId: listing.authorId,
        title: "New submission received",
        content: "You received a new listing submission.",
        listingId: listing.id,
      });

      return { ...application, conversationId };
    }),

  myApplicationForListing: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.marketplaceApplication.findFirst({
        where: { listingId: input.listingId, applicantId: userId },
        select: { id: true, createdAt: true },
      });
    }),

  myApplications: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    return prisma.marketplaceApplication.findMany({
      where: { applicantId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        listingId: true,
        applicantId: true,
        pitch: true,
        targetRate: true,
        estimatedDuration: true,
        proposalText: true,
        answers: true,
        provisioningStatus: true,
        createdAt: true,
        listing: {
          select: { id: true, title: true, type: true, status: true, authorId: true, applicationSchema: true },
        },
      },
    });
  }),

  myReceivedApplications: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id;
    return prisma.marketplaceApplication.findMany({
      where: { listing: { authorId: userId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        listingId: true,
        applicantId: true,
        pitch: true,
        targetRate: true,
        estimatedDuration: true,
        proposalText: true,
        answers: true,
        provisioningStatus: true,
        createdAt: true,
        applicant: { select: { id: true, name: true, image: true } },
        listing: { select: { id: true, title: true, type: true, applicationSchema: true } },
      },
    });
  }),

  listingApplications: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.listingId },
        select: { authorId: true },
      });
      if (!listing || listing.authorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed to view these applications" });
      }
      return prisma.marketplaceApplication.findMany({
        where: { listingId: input.listingId },
        orderBy: { createdAt: "desc" },
        include: {
          applicant: { select: { id: true, name: true, image: true } },
        },
      });
    }),

  submitProposal: protectedProcedure
    .input(
      z.object({
        applicationId: z.string(),
        proposalText: z.string().min(1),
        answers: z.record(z.string(), z.unknown()).optional().default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const app = await prisma.marketplaceApplication.findUnique({
        where: { id: input.applicationId },
        include: { listing: { select: { applicationSchema: true, authorId: true } } },
      });
      if (!app || app.applicantId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed to submit proposal" });
      }
      validateProposalAnswers(app.listing.applicationSchema, input.answers);
      const updated = await prisma.marketplaceApplication.update({
        where: { id: input.applicationId },
        data: {
          proposalText: input.proposalText,
          answers: input.answers as any,
          provisioningStatus: "proposal_submitted",
        },
      });
      const conversationId = await ensureProposalConversation(app.listing.authorId as string, userId);
      await createProposalSystemMessage({
        conversationId,
        senderId: userId,
        receiverId: app.listing.authorId as string,
        content: "Applicant submitted a revised proposal.",
      });
      await createProposalStatusNotification({
        userId: app.listing.authorId as string,
        title: "Proposal updated",
        content: "Applicant submitted proposal updates.",
        listingId: app.listingId,
      });
      return { ...updated, conversationId };
    }),

  listComments: protectedProcedure
    .input(z.object({ listingId: z.string(), page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const skip = (input.page - 1) * input.pageSize;
      const [total, items] = await Promise.all([
        prisma.listingComment.count({ where: { listingId: input.listingId, deletedAt: null } }),
        prisma.listingComment.findMany({
          where: { listingId: input.listingId, deletedAt: null },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
          skip,
          take: input.pageSize,
        }),
      ]);
      return { items, total, page: input.page, pageSize: input.pageSize };
    }),

  createComment: protectedProcedure
    .input(z.object({ listingId: z.string(), content: z.string().min(1).max(2000), parentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      return prisma.listingComment.create({
        data: {
          listingId: input.listingId,
          userId,
          parentId: input.parentId,
          content: input.content,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),

  rateListing: protectedProcedure
    .input(z.object({ listingId: z.string(), rating: z.number().int().min(1).max(5), title: z.string().optional(), body: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      await prisma.listingRating.upsert({
        where: { listingId_userId: { listingId: input.listingId, userId } },
        create: {
          listingId: input.listingId,
          userId,
          rating: input.rating,
          title: input.title,
          body: input.body,
        },
        update: {
          rating: input.rating,
          title: input.title,
          body: input.body,
          isEdited: true,
          editedAt: new Date(),
        },
      });

      const ratings = await prisma.listingRating.findMany({
        where: { listingId: input.listingId, moderationStatus: "APPROVED" },
        select: { rating: true },
      });
      const total = ratings.length;
      const avg = total ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;
      const counts = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r.rating === n).length);

      await prisma.marketplaceListing.update({
        where: { id: input.listingId },
        data: {
          ratingAvg: avg,
          ratingCount: total,
          rating1Count: counts[0],
          rating2Count: counts[1],
          rating3Count: counts[2],
          rating4Count: counts[3],
          rating5Count: counts[4],
        },
      });
      return { success: true, ratingAvg: avg, ratingCount: total };
    }),

  updateListingStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "PAUSED"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!listing || listing.authorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
      }
      const updated = await prisma.marketplaceListing.update({
        where: { id: input.id },
        data: { status: input.status },
        include: {
          author: { select: { id: true, name: true, isVerified: true } },
          _count: { select: { applications: true, orders: true } },
        },
      });
      return normalizeListing(updated);
    }),

  deleteListing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session!.user!.id;
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!listing || listing.authorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed" });
      }
      await prisma.marketplaceListing.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
