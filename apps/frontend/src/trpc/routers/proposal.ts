import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";
import { UsageManager } from "@/features/usage/utils/usageManager";
import { LimitGuard } from "@/features/usage/utils/limitGuard";
import { ProposalType } from "@agentflox/database/src/generated/prisma/client";

export const proposalRouter = router({
	list: protectedProcedure
		.input(z.object({
			query: z.string().optional(),
			status: z.enum(["draft", "published", "archived"]).optional(),
			projectId: z.string().optional(),
			category: z.enum(["INVESTMENT","MENTORSHIP","TEAM","COFOUNDER","PARTNERSHIP","CUSTOMER"]).optional(),
			industries: z.array(z.string()).optional(),
			country: z.string().optional(),
			commitment: z.enum(["PART_TIME","FULL_TIME","CONTRACT","FLEXIBLE"]).optional(),
			urgency: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
			minFunding: z.number().optional(),
			maxFunding: z.number().optional(),
			sortBy: z.string().optional(),
			page: z.number().int().min(1).optional().default(1),
			pageSize: z.number().int().min(1).max(50).optional().default(12),
			scope: z.enum(["all","owned","saved","interested"]).optional().default("owned")
		}))
        .query(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
            await LimitGuard.ensureCycle(userId);
			const where: any = { };
			// Scope handling for dashboard contexts
			if (input.scope === "owned") {
				where.userId = userId;
			} else if (input.scope === "saved") {
				where.likes = { some: { userId } };
			} else if (input.scope === "interested") {
				where.requests = { some: { senderId: userId } };
			} else {
				where.OR = [
					{ userId },
					{ likes: { some: { userId } } },
					{ requests: { some: { senderId: userId } } },
				];
			}
			if (input?.status) {
				where.status = input.status.toUpperCase();
			} else {
				where.status = "PUBLISHED";
			}
			if (input?.projectId) {
				where.projectId = input.projectId;
			}
			if (input?.category) {
				where.category = input.category;
			}
			if (input?.industries && input.industries.length > 0) {
				where.industry = { hasSome: input.industries };
			}
			if (input?.country) {
				where.location = { is: { country: input.country } };
			}
			if (input?.commitment) {
				where.timeline = { is: { commitment: input.commitment } };
			}
			if (input?.urgency) {
				where.timeline = { ...(where.timeline || {}), is: { ...(where.timeline?.is || {}), urgency: input.urgency } };
			}
			if (typeof input?.minFunding === 'number' || typeof input?.maxFunding === 'number') {
				where.investor = { is: {
					fundingNeeded: {
						...(typeof input.minFunding === 'number' ? { gte: input.minFunding } : {}),
						...(typeof input.maxFunding === 'number' ? { lte: input.maxFunding } : {}),
					}
				} };
			}
			// relevance mode handled below with full-text search; fallback text filters used otherwise
			if (input?.query && input.sortBy !== "relevance") {
				where.OR = [
					{ title: { contains: input.query, mode: "insensitive" } },
					{ shortSummary: { contains: input.query, mode: "insensitive" } },
					{ keywords: { has: input.query.toLowerCase() } },
				];
			}

			// If sorting by relevance and a query is present, use PostgreSQL full-text search
			if (input.sortBy === "relevance" && input.query) {
				// Compute total matches using full-text search on key fields
				const totalRows = await prisma.$queryRaw<{ count: bigint }[]>`
					SELECT COUNT(*)::bigint as count
					FROM "Proposal" p
					WHERE p."status" = 'PUBLISHED'
					AND to_tsvector('english',
						COALESCE(p.title, '') || ' ' ||
						COALESCE(p."shortSummary", '') || ' ' ||
						array_to_string(p.keywords, ' ')
					) @@ plainto_tsquery('english', ${input.query})
				`;
				const total = Number(totalRows?.[0]?.count ?? 0);

				// Get ordered ids by relevance with pagination
				const ranked = await prisma.$queryRaw<{ id: string }[]>`
					SELECT p.id
					FROM "Proposal" p
					WHERE p."status" = 'PUBLISHED'
					AND to_tsvector('english',
						COALESCE(p.title, '') || ' ' ||
						COALESCE(p."shortSummary", '') || ' ' ||
						array_to_string(p.keywords, ' ')
					) @@ plainto_tsquery('english', ${input.query})
					ORDER BY ts_rank(
						to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p."shortSummary", '') || ' ' || array_to_string(p.keywords, ' ')),
						plainto_tsquery('english', ${input.query})
					) DESC
					LIMIT ${input.pageSize}
					OFFSET ${(input.page - 1) * input.pageSize}
				`;
				const ids = ranked.map(r => r.id);
				if (ids.length === 0) {
					return { items: [], total, page: input.page, pageSize: input.pageSize };
				}
				const itemsRaw = await prisma.proposal.findMany({
					where: { id: { in: ids } },
					include: { location: true, timeline: true, contact: true },
				});
				// Preserve relevance order
				const orderMap = new Map<string, number>(
					ids.map((id, idx) => [id, idx] as const)
				  );
				const items = itemsRaw.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
				return { items, total, page: input.page, pageSize: input.pageSize };
			}

			const skip = (input.page - 1) * input.pageSize;
			const take = input.pageSize;
			const [total, items] = await Promise.all([
				prisma.proposal.count({ where }),
				prisma.proposal.findMany({
					where,
					orderBy: input.sortBy === "latest" ? { createdAt: "desc" } : { updatedAt: "desc" },
					skip,
					take,
					include: {
						location: true,
						timeline: true,
						contact: true,
					}
				}),
			]);
			return { items, total, page: input.page, pageSize: input.pageSize };
		}),

	get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
		return prisma.proposal.findFirst({ where: { id: input.id, userId: ctx.session!.user!.id } });
	}),

	publish: protectedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				category: z.string().optional(),
				projectId: z.string().optional(),
				teamId: z.string().optional(),
				title: z.string().optional(),
				shortSummary: z.string().optional(),
				detailedDesc: z.string().optional(),
				industry: z.array(z.string()).optional(),
				keywords: z.array(z.string()).optional(),
				visibility: z.enum(["PUBLIC","PRIVATE","MEMBERS_ONLY"]).optional(),
				expiresAt: z.string().optional(),
				language: z.string().optional(),
				currency: z.string().optional(),
				timezone: z.string().optional(),
				metadata: z.any().optional(),
				status: z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).optional(),
				// Nested objects
				location: z.any().nullable().optional(),
				timeline: z.any().nullable().optional(),
				contact: z.any().nullable().optional(),
				budget: z.any().nullable().optional(),
				// Category-specific blocks
				investor: z.any().optional(),
				mentor: z.any().optional(),
				team: z.any().optional(),
				cofounder: z.any().optional(),
				partner: z.any().optional(),
				customer: z.any().optional(),
				attachments: z.any().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const id = input.id;
			if (!id) {
				throw new Error("Proposal ID is required for publishing");
			}

			const baseData: any = {
				category: input.category ? String(input.category).toUpperCase() : undefined,
				projectId: input.projectId || undefined,
				teamId: input.teamId || undefined,
				title: input.title,
				shortSummary: input.shortSummary,
				detailedDesc: input.detailedDesc,
				industry: input.industry || [],
				keywords: input.keywords || [],
				status: "PUBLISHED", // Always set to PUBLISHED when publishing
				visibility: input.visibility,
				expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
				language: input.language,
				currency: input.currency,
				timezone: input.timezone,
				metadata: input.metadata ?? undefined,
				attachments: input.attachments && input.attachments.length > 0
					? {
						deleteMany: {},
						create: input.attachments,
					}
					: undefined,
			};

			const nestedData: any = {};
			if (input.location && input.location !== null && input.location.country) {
				nestedData.location = {
					upsert: {
						create: {
							country: input.location.country,
							countryCode: input.location.countryCode || 'XX',
							region: input.location.region || undefined,
							city: input.location.city || undefined,
							remote: Boolean(input.location.remote),
							hybrid: Boolean(input.location.hybrid),
							willRelocate: Boolean(input.location.willRelocate),
							timeZones: input.location.timeZones || [],
						},
						update: {
							country: input.location.country,
							countryCode: input.location.countryCode || 'XX',
							region: input.location.region || undefined,
							city: input.location.city || undefined,
							remote: Boolean(input.location.remote),
							hybrid: Boolean(input.location.hybrid),
							willRelocate: Boolean(input.location.willRelocate),
							timeZones: input.location.timeZones || [],
						}
					}
				};
			}
			if (input.timeline && input.timeline !== null) {
				nestedData.timeline = {
					upsert: {
						create: {
							startDate: input.timeline.startDate ? new Date(input.timeline.startDate) : undefined,
							endDate: input.timeline.endDate ? new Date(input.timeline.endDate) : undefined,
							duration: input.timeline.duration || undefined,
							commitment: input.timeline.commitment || 'FLEXIBLE',
							availability: input.timeline.availability || undefined,
							urgency: input.timeline.urgency || undefined,
						},
						update: {
							startDate: input.timeline.startDate ? new Date(input.timeline.startDate) : undefined,
							endDate: input.timeline.endDate ? new Date(input.timeline.endDate) : undefined,
							duration: input.timeline.duration || undefined,
							commitment: input.timeline.commitment || 'FLEXIBLE',
							availability: input.timeline.availability || undefined,
							urgency: input.timeline.urgency || undefined,
						}
					}
				};
			}
			if (input.contact && input.contact !== null && (input.contact.name || input.contact.email)) {
				nestedData.contact = {
					upsert: {
						create: {
							name: input.contact.name,
							email: input.contact.email,
							phone: input.contact.phone || undefined,
							website: input.contact.website || undefined,
							linkedin: input.contact.linkedin || undefined,
							twitter: input.contact.twitter || undefined,
							github: input.contact.github || undefined,
							telegram: input.contact.telegram || undefined,
							discord: input.contact.discord || undefined,
							preferredContact: input.contact.preferredContact || 'EMAIL',
							publicProfile: input.contact.publicProfile ?? true,
						},
						update: {
							name: input.contact.name,
							email: input.contact.email,
							phone: input.contact.phone || undefined,
							website: input.contact.website || undefined,
							linkedin: input.contact.linkedin || undefined,
							twitter: input.contact.twitter || undefined,
							github: input.contact.github || undefined,
							telegram: input.contact.telegram || undefined,
							discord: input.contact.discord || undefined,
							preferredContact: input.contact.preferredContact || 'EMAIL',
							publicProfile: input.contact.publicProfile ?? true,
						}
					}
				};
			}
			if (input.budget && input.budget !== null) {
				nestedData.budget = {
					upsert: {
						create: {
							minAmount: typeof input.budget.minAmount === 'number' ? input.budget.minAmount : undefined,
							maxAmount: typeof input.budget.maxAmount === 'number' ? input.budget.maxAmount : undefined,
							currency: input.budget.currency || 'USD',
							description: input.budget.description || undefined,
						},
						update: {
							minAmount: typeof input.budget.minAmount === 'number' ? input.budget.minAmount : undefined,
							maxAmount: typeof input.budget.maxAmount === 'number' ? input.budget.maxAmount : undefined,
							currency: input.budget.currency || 'USD',
							description: input.budget.description || undefined,
						}
					}
				};
			}
			if (input.investor) {
				nestedData.investor = {
					upsert: {
						create: {
							fundingNeeded: input.investor.fundingNeeded ?? undefined,
							fundingType: input.investor.fundingType || undefined,
							stage: input.investor.stage || undefined,
							currentRevenue: input.investor.currentRevenue ?? undefined,
							projectedRevenue: input.investor.projectedRevenue ?? undefined,
							customers: input.investor.customers ?? undefined,
							monthlyUsers: input.investor.monthlyUsers ?? undefined,
							growthRate: input.investor.growthRate ?? undefined,
							useOfFunds: input.investor.useOfFunds || undefined,
							teamSize: input.investor.teamSize ?? undefined,
							foundedDate: input.investor.foundedDate ? new Date(input.investor.foundedDate) : undefined,
							equityOffered: input.investor.equityOffered ?? undefined,
							minInvestment: input.investor.minInvestment ?? undefined,
							maxInvestment: input.investor.maxInvestment ?? undefined,
							boardSeat: Boolean(input.investor.boardSeat),
							expectedROI: input.investor.expectedROI ?? undefined,
							investorKind: input.investor.investorKind || [],
							exitStrategy: input.investor.exitStrategy || undefined,
						},
						update: {
							fundingNeeded: input.investor.fundingNeeded ?? undefined,
							fundingType: input.investor.fundingType || undefined,
							stage: input.investor.stage || undefined,
							currentRevenue: input.investor.currentRevenue ?? undefined,
							projectedRevenue: input.investor.projectedRevenue ?? undefined,
							customers: input.investor.customers ?? undefined,
							monthlyUsers: input.investor.monthlyUsers ?? undefined,
							growthRate: input.investor.growthRate ?? undefined,
							useOfFunds: input.investor.useOfFunds || undefined,
							teamSize: input.investor.teamSize ?? undefined,
							foundedDate: input.investor.foundedDate ? new Date(input.investor.foundedDate) : undefined,
							equityOffered: input.investor.equityOffered ?? undefined,
							minInvestment: input.investor.minInvestment ?? undefined,
							maxInvestment: input.investor.maxInvestment ?? undefined,
							boardSeat: Boolean(input.investor.boardSeat),
							expectedROI: input.investor.expectedROI ?? undefined,
							investorKind: input.investor.investorKind || [],
							exitStrategy: input.investor.exitStrategy || undefined,
						}
					}
				};
			}
			if (input.mentor) {
				nestedData.mentor = {
					upsert: {
						create: {
							seekingOrOffering: input.mentor.seekingOrOffering,
							guidanceAreas: input.mentor.guidanceAreas || [],
							specificChallenges: input.mentor.specificChallenges || undefined,
							currentStage: input.mentor.currentStage || undefined,
							preferredMentorBg: input.mentor.preferredMentorBackground || [],
							expertiseAreas: input.mentor.expertiseAreas || [],
							yearsExperience: input.mentor.yearsExperience ?? undefined,
							industriesServed: input.mentor.industriesServed || [],
							successStories: input.mentor.successStories || undefined,
							menteesCriteria: input.mentor.menteesCriteria || undefined,
							preferredEngage: input.mentor.preferredEngagement || undefined,
							sessionFrequency: input.mentor.sessionFrequency || undefined,
							compensationExp: input.mentor.compensationExpectation || undefined,
						},
						update: {
							seekingOrOffering: input.mentor.seekingOrOffering,
							guidanceAreas: input.mentor.guidanceAreas || [],
							specificChallenges: input.mentor.specificChallenges || undefined,
							currentStage: input.mentor.currentStage || undefined,
							preferredMentorBg: input.mentor.preferredMentorBackground || [],
							expertiseAreas: input.mentor.expertiseAreas || [],
							yearsExperience: input.mentor.yearsExperience ?? undefined,
							industriesServed: input.mentor.industriesServed || [],
							successStories: input.mentor.successStories || undefined,
							menteesCriteria: input.mentor.menteesCriteria || undefined,
							preferredEngage: input.mentor.preferredEngagement || undefined,
							sessionFrequency: input.mentor.sessionFrequency || undefined,
							compensationExp: input.mentor.compensationExpectation || undefined,
						}
					}
				};
			}
			if (input.team) {
				nestedData.team = {
					upsert: {
						create: {
							hiringOrSeeking: input.team.hiringOrSeeking,
							roleTitle: input.team.roleTitle,
							department: input.team.department || undefined,
							seniority: input.team.seniority || undefined,
							mustHaveSkills: input.team.mustHaveSkills || [],
							niceToHaveSkills: input.team.niceToHaveSkills || [],
							certifications: input.team.certifications || [],
							languagesRequired: input.team.languagesRequired || [],
							workArrangement: input.team.workArrangement || undefined,
							compensation: input.team.compensationType || undefined,
							salaryRange: input.team.salaryRange || undefined,
							benefits: input.team.benefits || [],
							companySize: input.team.companySize || undefined,
							companyStage: input.team.companyStage || undefined,
							teamCulture: input.team.teamCulture || undefined,
						},
						update: {
							hiringOrSeeking: input.team.hiringOrSeeking,
							roleTitle: input.team.roleTitle,
							department: input.team.department || undefined,
							seniority: input.team.seniority || undefined,
							mustHaveSkills: input.team.mustHaveSkills || [],
							niceToHaveSkills: input.team.niceToHaveSkills || [],
							certifications: input.team.certifications || [],
							languagesRequired: input.team.languagesRequired || [],
							workArrangement: input.team.workArrangement || undefined,
							compensation: input.team.compensationType || undefined,
							salaryRange: input.team.salaryRange || undefined,
							benefits: input.team.benefits || [],
							companySize: input.team.companySize || undefined,
							companyStage: input.team.companyStage || undefined,
							teamCulture: input.team.teamCulture || undefined,
						}
					}
				};
			}
			if (input.cofounder) {
				nestedData.cofounder = {
					upsert: {
						create: {
							seekingOrOffering: input.cofounder.seekingOrOffering,
							roleTitle: input.cofounder.roleTitle,
							keyResponsibilities: input.cofounder.keyResponsibilities || [],
							decisionAreas: input.cofounder.decisionAreas || [],
							equityOffered: input.cofounder.equityOffered ?? undefined,
							equityExpected: input.cofounder.equityExpected ?? undefined,
							vestingSchedule: input.cofounder.vestingSchedule || undefined,
							timeCommitment: input.cofounder.timeCommitment,
							requiredSkills: input.cofounder.requiredSkills || [],
							preferredBackground: input.cofounder.preferredBackground || [],
							mustHaveExperience: input.cofounder.mustHaveExperience || [],
							personalityTraits: input.cofounder.personalityTraits || [],
							businessStage: input.cofounder.businessStage || undefined,
							currentTeamSize: input.cofounder.currentTeamSize ?? undefined,
							businessModel: input.cofounder.businessModel || undefined,
							targetMarket: input.cofounder.targetMarket || undefined,
							workStyle: input.cofounder.workStyle || undefined,
							companyValues: input.cofounder.companyValues || [],
							conflictResolution: input.cofounder.conflictResolution || undefined,
						},
						update: {
							seekingOrOffering: input.cofounder.seekingOrOffering,
							roleTitle: input.cofounder.roleTitle,
							keyResponsibilities: input.cofounder.keyResponsibilities || [],
							decisionAreas: input.cofounder.decisionAreas || [],
							equityOffered: input.cofounder.equityOffered ?? undefined,
							equityExpected: input.cofounder.equityExpected ?? undefined,
							vestingSchedule: input.cofounder.vestingSchedule || undefined,
							timeCommitment: input.cofounder.timeCommitment,
							requiredSkills: input.cofounder.requiredSkills || [],
							preferredBackground: input.cofounder.preferredBackground || [],
							mustHaveExperience: input.cofounder.mustHaveExperience || [],
							personalityTraits: input.cofounder.personalityTraits || [],
							businessStage: input.cofounder.businessStage || undefined,
							currentTeamSize: input.cofounder.currentTeamSize ?? undefined,
							businessModel: input.cofounder.businessModel || undefined,
							targetMarket: input.cofounder.targetMarket || undefined,
							workStyle: input.cofounder.workStyle || undefined,
							companyValues: input.cofounder.companyValues || [],
							conflictResolution: input.cofounder.conflictResolution || undefined,
						}
					}
				};
			}
			if (input.partner) {
				nestedData.partner = {
					upsert: {
						create: {
							seekingOrOffering: input.partner.seekingOrOffering,
							partnershipType: input.partner.partnershipType,
							valueOffered: input.partner.valueOffered,
							valueExpected: input.partner.valueExpected,
							mutualBenefits: input.partner.mutualBenefits || [],
							partnershipModel: input.partner.partnershipModel || undefined,
							revenueSharing: input.partner.revenueSharing ?? undefined,
							exclusivity: input.partner.exclusivity || undefined,
							duration: input.partner.duration || undefined,
							partnerCriteria: input.partner.partnerCriteria || undefined,
							minimumRequirements: input.partner.minimumRequirements || [],
							idealPartnerProfile: input.partner.idealPartnerProfile || undefined,
							currentPartners: input.partner.currentPartners ?? undefined,
							marketReach: input.partner.marketReach || [],
							customerBase: input.partner.customerBase ?? undefined,
							annualRevenue: input.partner.annualRevenue ?? undefined,
						},
						update: {
							seekingOrOffering: input.partner.seekingOrOffering,
							partnershipType: input.partner.partnershipType,
							valueOffered: input.partner.valueOffered,
							valueExpected: input.partner.valueExpected,
							mutualBenefits: input.partner.mutualBenefits || [],
							partnershipModel: input.partner.partnershipModel || undefined,
							revenueSharing: input.partner.revenueSharing ?? undefined,
							exclusivity: input.partner.exclusivity || undefined,
							duration: input.partner.duration || undefined,
							partnerCriteria: input.partner.partnerCriteria || undefined,
							minimumRequirements: input.partner.minimumRequirements || [],
							idealPartnerProfile: input.partner.idealPartnerProfile || undefined,
							currentPartners: input.partner.currentPartners ?? undefined,
							marketReach: input.partner.marketReach || [],
							customerBase: input.partner.customerBase ?? undefined,
							annualRevenue: input.partner.annualRevenue ?? undefined,
						}
					}
				};
			}
			if (input.customer) {
				nestedData.customer = {
					upsert: {
						create: {
							sellingOrBuying: input.customer.sellingOrBuying,
							productService: input.customer.productService,
							category: input.customer.category || undefined,
							description: input.customer.description,
							pricingModel: input.customer.pricingModel || undefined,
							priceRange: input.customer.priceRange || undefined,
							availability: input.customer.availability || undefined,
							deliveryTime: input.customer.deliveryTime || undefined,
							targetAudience: input.customer.targetAudience || undefined,
							customerBenefits: input.customer.customerBenefits || [],
							uniqueSellingProp: input.customer.uniqueSellingProposition || undefined,
							requirements: input.customer.requirements || [],
							budgetRange: input.customer.budgetRange || undefined,
							decisionCriteria: input.customer.decisionCriteria || [],
							timeframe: input.customer.timeframe || undefined,
							marketSize: input.customer.marketSize || undefined,
							competitors: input.customer.competitors || [],
							previousClients: input.customer.previousClients ?? undefined,
							testimonials: input.customer.testimonials || undefined,
							supportIncluded: input.customer.supportIncluded || [],
							warrantyTerms: input.customer.warrantyTerms || undefined,
							paymentTerms: input.customer.paymentTerms || undefined,
						},
						update: {
							sellingOrBuying: input.customer.sellingOrBuying,
							productService: input.customer.productService,
							category: input.customer.category || undefined,
							description: input.customer.description,
							pricingModel: input.customer.pricingModel || undefined,
							priceRange: input.customer.priceRange || undefined,
							availability: input.customer.availability || undefined,
							deliveryTime: input.customer.deliveryTime || undefined,
							targetAudience: input.customer.targetAudience || undefined,
							customerBenefits: input.customer.customerBenefits || [],
							uniqueSellingProp: input.customer.uniqueSellingProposition || undefined,
							requirements: input.customer.requirements || [],
							budgetRange: input.customer.budgetRange || undefined,
							decisionCriteria: input.customer.decisionCriteria || [],
							timeframe: input.customer.timeframe || undefined,
							marketSize: input.customer.marketSize || undefined,
							competitors: input.customer.competitors || [],
							previousClients: input.customer.previousClients ?? undefined,
							testimonials: input.customer.testimonials || undefined,
							supportIncluded: input.customer.supportIncluded || [],
							warrantyTerms: input.customer.warrantyTerms || undefined,
							paymentTerms: input.customer.paymentTerms || undefined,
						}
					}
				};
			}

			const updated = await prisma.proposal.update({ 
				where: { id, userId: ctx.session!.user!.id }, 
				data: {
					...baseData,
					...nestedData,
				},
				include: { location: true, timeline: true, contact: true, budget: true, investor: true, mentor: true, team: true, cofounder: true, partner: true, customer: true }
			});
			return { id: updated.id, data: updated } as const;
		}),

	create: protectedProcedure
	  .input(
	    z.object({
	      title: z.string(),
	      shortSummary: z.string(),
	      detailedDesc: z.string(),
		  category: z.enum(["INVESTMENT","MENTORSHIP","TEAM","COFOUNDER","PARTNERSHIP","CUSTOMER"]),
	      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
	      intent: z.enum(["SEEKING", "OFFERING"]).optional(),
		  projectId: z.string().optional(),
		  teamId: z.string().optional(),
	    })
	  )
  .mutation(async ({ ctx, input }) => {
    await LimitGuard.ensureWithinCreateLimit(ctx.session!.user!.id, 'PROPOSAL');
	    const baseData = {
	      userId: ctx.session!.user!.id,
	      title: input.title,
	      shortSummary: input.shortSummary,
	      detailedDesc: input.detailedDesc,
		  category: input.category.toUpperCase() as ProposalType,
	      status: input.status ?? "DRAFT",
	      intent: input.intent ?? "OFFERING",
	      projectId: input.projectId || undefined,
		  teamId: input.teamId || undefined,
	      createdBy: ctx.session!.user!.id
	    };

	    const created = await prisma.proposal.create({
	      data: baseData,
	    });

	    // Update usage for proposal creation
	    try {
	      await UsageManager.updateServiceUsage(
	        ctx.session!.user!.id,
	        ctx.session!.user!.name || ctx.session!.user!.email || "",
	        "PROPOSAL" as any,
	        1,
	        ctx.session!.user!.email || undefined
	      );
	    } catch (e) {
	      console.error("Proposal usage update failed:", e);
	    }

	    return { id: created.id, data: created } as const;
	  }),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				category: z.enum(["INVESTMENT","MENTORSHIP","TEAM","COFOUNDER","PARTNERSHIP","CUSTOMER"]).optional(),
				projectId: z.string().optional(),
				title: z.string().optional(),
				shortSummary: z.string().optional(),
				detailedDesc: z.string().optional(),
				industry: z.array(z.string()).optional(),
				visibility: z.enum(["PUBLIC","PRIVATE","MEMBERS_ONLY"]).optional(),
				expiresAt: z.iso.datetime().optional(),
				metadata: z.any().optional(),
				attachments: z.any().optional(),
				status: z.enum(["DRAFT","PUBLISHED","ARCHIVED"]).optional(),
			})
		)
        .mutation(async ({ ctx, input }) => {
            await LimitGuard.ensureCanModify(ctx.session!.user!.id, 'PROPOSAL');
			const { id, ...updateData } = input;
			const baseData: any = {
				category: updateData.category ? String(updateData.category).toUpperCase() : undefined,
				projectId: updateData.projectId,
				title: updateData.title,
				shortSummary: updateData.shortSummary,
				detailedDesc: updateData.detailedDesc,
				industry: updateData.industry,
				status: updateData.status,
				visibility: updateData.visibility,
				expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
				metadata: updateData.metadata,
				attachments: updateData.attachments && updateData.attachments.length > 0
					? {
						deleteMany: {},
						create: updateData.attachments,
					}
					: undefined,
			};

			const updated = await prisma.proposal.update({ 
				where: { id, userId: ctx.session!.user!.id }, 
				data: baseData,
				include: { location: true, timeline: true, contact: true, budget: true, investor: true, mentor: true, team: true, cofounder: true, partner: true, customer: true }
			});
			return { id: updated.id, data: updated } as const;
		}),

	saveDraft: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				category: z.string().optional(),
				projectId: z.string().optional(),
				title: z.string().optional(),
				shortSummary: z.string().optional(),
				detailedDesc: z.string().optional(),
				industry: z.array(z.string()).optional(),
				keywords: z.array(z.string()).optional(),
				visibility: z.enum(["PUBLIC","PRIVATE","MEMBERS_ONLY"]).optional(),
				expiresAt: z.string().optional(),
				language: z.string().optional(),
				currency: z.string().optional(),
				timezone: z.string().optional(),
				metadata: z.any().optional(),
				// Nested objects
				location: z.any().nullable().optional(),
				timeline: z.any().nullable().optional(),
				contact: z.any().nullable().optional(),
				budget: z.any().nullable().optional(),
				// Category-specific blocks
				investor: z.any().optional(),
				mentor: z.any().optional(),
				team: z.any().optional(),
				cofounder: z.any().optional(),
				partner: z.any().optional(),
				customer: z.any().optional(),
				attachments: z.any().optional()
			})
		)
        .mutation(async ({ ctx, input }) => {
            await LimitGuard.ensureCanModify(ctx.session!.user!.id, 'PROPOSAL');
			const { id, ...updateData } = input;
			// Prevent demoting a published proposal back to draft
			const existing = await prisma.proposal.findFirst({ where: { id, userId: ctx.session!.user!.id }, select: { status: true } });
			const nextStatus = existing?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

			const baseData: any = {
				category: updateData.category ? String(updateData.category).toUpperCase() : undefined,
				projectId: updateData.projectId,
				title: updateData.title,
				shortSummary: updateData.shortSummary,
				detailedDesc: updateData.detailedDesc,
				industry: updateData.industry,
				keywords: updateData.keywords,
				visibility: updateData.visibility,
				expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
				language: updateData.language,
				currency: updateData.currency,
				timezone: updateData.timezone,
				metadata: updateData.metadata,
				attachments: updateData.attachments && updateData.attachments.length > 0
				? {
					deleteMany: {},
					create: updateData.attachments,
				  }
				: undefined,
				status: nextStatus,
			};

			// Build nested upserts for all blocks (same as publish)
			const nestedData: any = {};
			if (updateData.location && updateData.location !== null && updateData.location.country) {
				nestedData.location = {
					upsert: {
						create: {
							country: updateData.location.country,
							countryCode: updateData.location.countryCode || 'XX',
							region: updateData.location.region || undefined,
							city: updateData.location.city || undefined,
							remote: Boolean(updateData.location.remote),
							hybrid: Boolean(updateData.location.hybrid),
							willRelocate: Boolean(updateData.location.willRelocate),
							timeZones: updateData.location.timeZones || [],
						},
						update: {
							country: updateData.location.country,
							countryCode: updateData.location.countryCode || 'XX',
							region: updateData.location.region || undefined,
							city: updateData.location.city || undefined,
							remote: Boolean(updateData.location.remote),
							hybrid: Boolean(updateData.location.hybrid),
							willRelocate: Boolean(updateData.location.willRelocate),
							timeZones: updateData.location.timeZones || [],
						}
					}
				};
			}
			if (updateData.timeline && updateData.timeline !== null) {
				nestedData.timeline = {
					upsert: {
						create: {
							startDate: updateData.timeline.startDate ? new Date(updateData.timeline.startDate) : undefined,
							endDate: updateData.timeline.endDate ? new Date(updateData.timeline.endDate) : undefined,
							duration: updateData.timeline.duration || undefined,
							commitment: updateData.timeline.commitment || 'FLEXIBLE',
							availability: updateData.timeline.availability || undefined,
							urgency: updateData.timeline.urgency || undefined,
						},
						update: {
							startDate: updateData.timeline.startDate ? new Date(updateData.timeline.startDate) : undefined,
							endDate: updateData.timeline.endDate ? new Date(updateData.timeline.endDate) : undefined,
							duration: updateData.timeline.duration || undefined,
							commitment: updateData.timeline.commitment || 'FLEXIBLE',
							availability: updateData.timeline.availability || undefined,
							urgency: updateData.timeline.urgency || undefined,
						}
					}
				};
			}
			if (updateData.contact && updateData.contact !== null && (updateData.contact.name || updateData.contact.email)) {
				nestedData.contact = {
					upsert: {
						create: {
							name: updateData.contact.name,
							email: updateData.contact.email,
							phone: updateData.contact.phone || undefined,
							website: updateData.contact.website || undefined,
							linkedin: updateData.contact.linkedin || undefined,
							twitter: updateData.contact.twitter || undefined,
							github: updateData.contact.github || undefined,
							telegram: updateData.contact.telegram || undefined,
							discord: updateData.contact.discord || undefined,
							preferredContact: updateData.contact.preferredContact || 'EMAIL',
							publicProfile: updateData.contact.publicProfile ?? true,
						},
						update: {
							name: updateData.contact.name,
							email: updateData.contact.email,
							phone: updateData.contact.phone || undefined,
							website: updateData.contact.website || undefined,
							linkedin: updateData.contact.linkedin || undefined,
							twitter: updateData.contact.twitter || undefined,
							github: updateData.contact.github || undefined,
							telegram: updateData.contact.telegram || undefined,
							discord: updateData.contact.discord || undefined,
							preferredContact: updateData.contact.preferredContact || 'EMAIL',
							publicProfile: updateData.contact.publicProfile ?? true,
						}
					}
				};
			}
			if (updateData.budget && updateData.budget !== null) {
				nestedData.budget = {
					upsert: {
						create: {
							minAmount: typeof updateData.budget.minAmount === 'number' ? updateData.budget.minAmount : undefined,
							maxAmount: typeof updateData.budget.maxAmount === 'number' ? updateData.budget.maxAmount : undefined,
							currency: updateData.budget.currency || 'USD',
							description: updateData.budget.description || undefined,
						},
						update: {
							minAmount: typeof updateData.budget.minAmount === 'number' ? updateData.budget.minAmount : undefined,
							maxAmount: typeof updateData.budget.maxAmount === 'number' ? updateData.budget.maxAmount : undefined,
							currency: updateData.budget.currency || 'USD',
							description: updateData.budget.description || undefined,
						}
					}
				};
			}
			if (updateData.investor) {
				nestedData.investor = {
					upsert: {
						create: {
							fundingNeeded: updateData.investor.fundingNeeded ?? undefined,
							fundingType: updateData.investor.fundingType || undefined,
							stage: updateData.investor.stage || undefined,
							currentRevenue: updateData.investor.currentRevenue ?? undefined,
							projectedRevenue: updateData.investor.projectedRevenue ?? undefined,
							customers: updateData.investor.customers ?? undefined,
							monthlyUsers: updateData.investor.monthlyUsers ?? undefined,
							growthRate: updateData.investor.growthRate ?? undefined,
							useOfFunds: updateData.investor.useOfFunds || undefined,
							teamSize: updateData.investor.teamSize ?? undefined,
							foundedDate: updateData.investor.foundedDate ? new Date(updateData.investor.foundedDate) : undefined,
							equityOffered: updateData.investor.equityOffered ?? undefined,
							minInvestment: updateData.investor.minInvestment ?? undefined,
							maxInvestment: updateData.investor.maxInvestment ?? undefined,
							boardSeat: Boolean(updateData.investor.boardSeat),
							expectedROI: updateData.investor.expectedROI ?? undefined,
							investorKind: updateData.investor.investorKind || [],
							exitStrategy: updateData.investor.exitStrategy || undefined,
						},
						update: {
							fundingNeeded: updateData.investor.fundingNeeded ?? undefined,
							fundingType: updateData.investor.fundingType || undefined,
							stage: updateData.investor.stage || undefined,
							currentRevenue: updateData.investor.currentRevenue ?? undefined,
							projectedRevenue: updateData.investor.projectedRevenue ?? undefined,
							customers: updateData.investor.customers ?? undefined,
							monthlyUsers: updateData.investor.monthlyUsers ?? undefined,
							growthRate: updateData.investor.growthRate ?? undefined,
							useOfFunds: updateData.investor.useOfFunds || undefined,
							teamSize: updateData.investor.teamSize ?? undefined,
							foundedDate: updateData.investor.foundedDate ? new Date(updateData.investor.foundedDate) : undefined,
							equityOffered: updateData.investor.equityOffered ?? undefined,
							minInvestment: updateData.investor.minInvestment ?? undefined,
							maxInvestment: updateData.investor.maxInvestment ?? undefined,
							boardSeat: Boolean(updateData.investor.boardSeat),
							expectedROI: updateData.investor.expectedROI ?? undefined,
							investorKind: updateData.investor.investorKind || [],
							exitStrategy: updateData.investor.exitStrategy || undefined,
						}
					}
				};
			}
			if (updateData.mentor) {
				nestedData.mentor = {
					upsert: {
						create: {
							seekingOrOffering: updateData.mentor.seekingOrOffering,
							guidanceAreas: updateData.mentor.guidanceAreas || [],
							specificChallenges: updateData.mentor.specificChallenges || undefined,
							currentStage: updateData.mentor.currentStage || undefined,
							preferredMentorBg: updateData.mentor.preferredMentorBackground || [],
							expertiseAreas: updateData.mentor.expertiseAreas || [],
							yearsExperience: updateData.mentor.yearsExperience ?? undefined,
							industriesServed: updateData.mentor.industriesServed || [],
							successStories: updateData.mentor.successStories || undefined,
							menteesCriteria: updateData.mentor.menteesCriteria || undefined,
							preferredEngage: updateData.mentor.preferredEngagement || undefined,
							sessionFrequency: updateData.mentor.sessionFrequency || undefined,
							compensationExp: updateData.mentor.compensationExpectation || undefined,
						},
						update: {
							seekingOrOffering: updateData.mentor.seekingOrOffering,
							guidanceAreas: updateData.mentor.guidanceAreas || [],
							specificChallenges: updateData.mentor.specificChallenges || undefined,
							currentStage: updateData.mentor.currentStage || undefined,
							preferredMentorBg: updateData.mentor.preferredMentorBackground || [],
							expertiseAreas: updateData.mentor.expertiseAreas || [],
							yearsExperience: updateData.mentor.yearsExperience ?? undefined,
							industriesServed: updateData.mentor.industriesServed || [],
							successStories: updateData.mentor.successStories || undefined,
							menteesCriteria: updateData.mentor.menteesCriteria || undefined,
							preferredEngage: updateData.mentor.preferredEngagement || undefined,
							sessionFrequency: updateData.mentor.sessionFrequency || undefined,
							compensationExp: updateData.mentor.compensationExpectation || undefined,
						}
					}
				};
			}
			if (updateData.team) {
				nestedData.team = {
					upsert: {
						create: {
							hiringOrSeeking: updateData.team.hiringOrSeeking,
							roleTitle: updateData.team.roleTitle,
							department: updateData.team.department || undefined,
							seniority: updateData.team.seniority || undefined,
							mustHaveSkills: updateData.team.mustHaveSkills || [],
							niceToHaveSkills: updateData.team.niceToHaveSkills || [],
							certifications: updateData.team.certifications || [],
							languagesRequired: updateData.team.languagesRequired || [],
							workArrangement: updateData.team.workArrangement || undefined,
							compensation: updateData.team.compensationType || undefined,
							salaryRange: updateData.team.salaryRange || undefined,
							benefits: updateData.team.benefits || [],
							companySize: updateData.team.companySize || undefined,
							companyStage: updateData.team.companyStage || undefined,
							teamCulture: updateData.team.teamCulture || undefined,
						},
						update: {
							hiringOrSeeking: updateData.team.hiringOrSeeking,
							roleTitle: updateData.team.roleTitle,
							department: updateData.team.department || undefined,
							seniority: updateData.team.seniority || undefined,
							mustHaveSkills: updateData.team.mustHaveSkills || [],
							niceToHaveSkills: updateData.team.niceToHaveSkills || [],
							certifications: updateData.team.certifications || [],
							languagesRequired: updateData.team.languagesRequired || [],
							workArrangement: updateData.team.workArrangement || undefined,
							compensation: updateData.team.compensationType || undefined,
							salaryRange: updateData.team.salaryRange || undefined,
							benefits: updateData.team.benefits || [],
							companySize: updateData.team.companySize || undefined,
							companyStage: updateData.team.companyStage || undefined,
							teamCulture: updateData.team.teamCulture || undefined,
						}
					}
				};
			}
			if (updateData.cofounder) {
				nestedData.cofounder = {
					upsert: {
						create: {
							seekingOrOffering: updateData.cofounder.seekingOrOffering,
							roleTitle: updateData.cofounder.roleTitle,
							keyResponsibilities: updateData.cofounder.keyResponsibilities || [],
							decisionAreas: updateData.cofounder.decisionAreas || [],
							equityOffered: updateData.cofounder.equityOffered ?? undefined,
							equityExpected: updateData.cofounder.equityExpected ?? undefined,
							vestingSchedule: updateData.cofounder.vestingSchedule || undefined,
							timeCommitment: updateData.cofounder.timeCommitment,
							requiredSkills: updateData.cofounder.requiredSkills || [],
							preferredBackground: updateData.cofounder.preferredBackground || [],
							mustHaveExperience: updateData.cofounder.mustHaveExperience || [],
							personalityTraits: updateData.cofounder.personalityTraits || [],
							businessStage: updateData.cofounder.businessStage || undefined,
							currentTeamSize: updateData.cofounder.currentTeamSize ?? undefined,
							businessModel: updateData.cofounder.businessModel || undefined,
							targetMarket: updateData.cofounder.targetMarket || undefined,
							workStyle: updateData.cofounder.workStyle || undefined,
							companyValues: updateData.cofounder.companyValues || [],
							conflictResolution: updateData.cofounder.conflictResolution || undefined,
						},
						update: {
							seekingOrOffering: updateData.cofounder.seekingOrOffering,
							roleTitle: updateData.cofounder.roleTitle,
							keyResponsibilities: updateData.cofounder.keyResponsibilities || [],
							decisionAreas: updateData.cofounder.decisionAreas || [],
							equityOffered: updateData.cofounder.equityOffered ?? undefined,
							equityExpected: updateData.cofounder.equityExpected ?? undefined,
							vestingSchedule: updateData.cofounder.vestingSchedule || undefined,
							timeCommitment: updateData.cofounder.timeCommitment,
							requiredSkills: updateData.cofounder.requiredSkills || [],
							preferredBackground: updateData.cofounder.preferredBackground || [],
							mustHaveExperience: updateData.cofounder.mustHaveExperience || [],
							personalityTraits: updateData.cofounder.personalityTraits || [],
							businessStage: updateData.cofounder.businessStage || undefined,
							currentTeamSize: updateData.cofounder.currentTeamSize ?? undefined,
							businessModel: updateData.cofounder.businessModel || undefined,
							targetMarket: updateData.cofounder.targetMarket || undefined,
							workStyle: updateData.cofounder.workStyle || undefined,
							companyValues: updateData.cofounder.companyValues || [],
							conflictResolution: updateData.cofounder.conflictResolution || undefined,
						}
					}
				};
			}
			if (updateData.partner) {
				nestedData.partner = {
					upsert: {
						create: {
							seekingOrOffering: updateData.partner.seekingOrOffering,
							partnershipType: updateData.partner.partnershipType,
							valueOffered: updateData.partner.valueOffered,
							valueExpected: updateData.partner.valueExpected,
							mutualBenefits: updateData.partner.mutualBenefits || [],
							partnershipModel: updateData.partner.partnershipModel || undefined,
							revenueSharing: updateData.partner.revenueSharing ?? undefined,
							exclusivity: updateData.partner.exclusivity || undefined,
							duration: updateData.partner.duration || undefined,
							partnerCriteria: updateData.partner.partnerCriteria || undefined,
							minimumRequirements: updateData.partner.minimumRequirements || [],
							idealPartnerProfile: updateData.partner.idealPartnerProfile || undefined,
							currentPartners: updateData.partner.currentPartners ?? undefined,
							marketReach: updateData.partner.marketReach || [],
							customerBase: updateData.partner.customerBase ?? undefined,
							annualRevenue: updateData.partner.annualRevenue ?? undefined,
						},
						update: {
							seekingOrOffering: updateData.partner.seekingOrOffering,
							partnershipType: updateData.partner.partnershipType,
							valueOffered: updateData.partner.valueOffered,
							valueExpected: updateData.partner.valueExpected,
							mutualBenefits: updateData.partner.mutualBenefits || [],
							partnershipModel: updateData.partner.partnershipModel || undefined,
							revenueSharing: updateData.partner.revenueSharing ?? undefined,
							exclusivity: updateData.partner.exclusivity || undefined,
							duration: updateData.partner.duration || undefined,
							partnerCriteria: updateData.partner.partnerCriteria || undefined,
							minimumRequirements: updateData.partner.minimumRequirements || [],
							idealPartnerProfile: updateData.partner.idealPartnerProfile || undefined,
							currentPartners: updateData.partner.currentPartners ?? undefined,
							marketReach: updateData.partner.marketReach || [],
							customerBase: updateData.partner.customerBase ?? undefined,
							annualRevenue: updateData.partner.annualRevenue ?? undefined,
						}
					}
				};
			}
			if (updateData.customer) {
				nestedData.customer = {
					upsert: {
						create: {
							sellingOrBuying: updateData.customer.sellingOrBuying,
							productService: updateData.customer.productService,
							category: updateData.customer.category || undefined,
							description: updateData.customer.description,
							pricingModel: updateData.customer.pricingModel || undefined,
							priceRange: updateData.customer.priceRange || undefined,
							availability: updateData.customer.availability || undefined,
							deliveryTime: updateData.customer.deliveryTime || undefined,
							targetAudience: updateData.customer.targetAudience || undefined,
							customerBenefits: updateData.customer.customerBenefits || [],
							uniqueSellingProp: updateData.customer.uniqueSellingProposition || undefined,
							requirements: updateData.customer.requirements || [],
							budgetRange: updateData.customer.budgetRange || undefined,
							decisionCriteria: updateData.customer.decisionCriteria || [],
							timeframe: updateData.customer.timeframe || undefined,
							marketSize: updateData.customer.marketSize || undefined,
							competitors: updateData.customer.competitors || [],
							previousClients: updateData.customer.previousClients ?? undefined,
							testimonials: updateData.customer.testimonials || undefined,
							supportIncluded: updateData.customer.supportIncluded || [],
							warrantyTerms: updateData.customer.warrantyTerms || undefined,
							paymentTerms: updateData.customer.paymentTerms || undefined,
						},
						update: {
							sellingOrBuying: updateData.customer.sellingOrBuying,
							productService: updateData.customer.productService,
							category: updateData.customer.category || undefined,
							description: updateData.customer.description,
							pricingModel: updateData.customer.pricingModel || undefined,
							priceRange: updateData.customer.priceRange || undefined,
							availability: updateData.customer.availability || undefined,
							deliveryTime: updateData.customer.deliveryTime || undefined,
							targetAudience: updateData.customer.targetAudience || undefined,
							customerBenefits: updateData.customer.customerBenefits || [],
							uniqueSellingProp: updateData.customer.uniqueSellingProposition || undefined,
							requirements: updateData.customer.requirements || [],
							budgetRange: updateData.customer.budgetRange || undefined,
							decisionCriteria: updateData.customer.decisionCriteria || [],
							timeframe: updateData.customer.timeframe || undefined,
							marketSize: updateData.customer.marketSize || undefined,
							competitors: updateData.customer.competitors || [],
							previousClients: updateData.customer.previousClients ?? undefined,
							testimonials: updateData.customer.testimonials || undefined,
							supportIncluded: updateData.customer.supportIncluded || [],
							warrantyTerms: updateData.customer.warrantyTerms || undefined,
							paymentTerms: updateData.customer.paymentTerms || undefined,
						}
					}
				};
			}

			const updated = await prisma.proposal.update({ 
				where: { id, userId: ctx.session!.user!.id }, 
				data: { ...baseData, ...nestedData },
				include: { location: true, timeline: true, contact: true, budget: true, investor: true, mentor: true, team: true, cofounder: true, partner: true, customer: true }
			});
			return { id: updated.id, data: updated } as const;
		}),

	archive: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const updated = await prisma.proposal.update({
				where: { id: input.id, userId: ctx.session!.user!.id },
				data: { status: "ARCHIVED" },
			});
			return updated.id;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return prisma.proposal.delete({ 
				where: { 
					id: input.id, 
					userId: ctx.session!.user!.id 
				} 
			});
		}),

	getSinglePublicProposal: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return prisma.proposal.findFirst({
				where: { 
					id: input.id,
					status: "PUBLISHED",
					visibility: "PUBLIC"
				},
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
						}
					},
					likes: {
						select: {
							userId: true,
						}
					},
					location: true,
					timeline: true,
					contact: true,
					budget: true,
					investor: true,
					mentor: true,
					team: true,
					cofounder: true,
					partner: true,
					customer: true,
				}
			});
		}),

	getPublicProposals: protectedProcedure
		.input(z.object({
			query: z.string().optional(),
			category: z.enum(["INVESTMENT","MENTORSHIP","TEAM","COFOUNDER","PARTNERSHIP","CUSTOMER"]).optional(),
			industries: z.array(z.string()).optional(),
			country: z.string().optional(),
			commitment: z.enum(["PART_TIME","FULL_TIME","CONTRACT","FLEXIBLE"]).optional(),
			urgency: z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),
			minFunding: z.number().optional(),
			maxFunding: z.number().optional(),
			sortBy: z.enum(["relevance","latest"]).optional().default("latest"),
			page: z.number().int().min(1).optional().default(1),
			pageSize: z.number().int().min(1).max(50).optional().default(12),
		}))
		.query(async ({ ctx, input }) => {
			const where: any = {
				status: "PUBLISHED",
				visibility: "PUBLIC",
			};

			if (input?.category) {
				where.category = input.category;
			}

			if (input?.industries && input.industries.length > 0) {
				where.industry = { hasSome: input.industries };
			}

			if (input?.country) {
				where.location = { is: { country: input.country } };
			}

			if (input?.commitment) {
				where.timeline = { is: { commitment: input.commitment } };
			}

			if (input?.urgency) {
				where.timeline = { ...(where.timeline || {}), is: { ...(where.timeline?.is || {}), urgency: input.urgency } };
			}

			if (typeof input?.minFunding === 'number' || typeof input?.maxFunding === 'number') {
				where.investor = { is: {
					fundingNeeded: {
						...(typeof input.minFunding === 'number' ? { gte: input.minFunding } : {}),
						...(typeof input.maxFunding === 'number' ? { lte: input.maxFunding } : {}),
					}
				} };
			}

			// relevance mode handled below with full-text search; fallback text filters used otherwise
			if (input?.query && input.sortBy !== "relevance") {
				where.OR = [
					{ title: { contains: input.query, mode: "insensitive" } },
					{ shortSummary: { contains: input.query, mode: "insensitive" } },
					{ keywords: { has: input.query.toLowerCase() } },
				];
			}

			// If sorting by relevance and a query is present, use PostgreSQL full-text search
			if (input.sortBy === "relevance" && input.query) {
				// Compute total matches using full-text search on key fields
				const totalRows = await prisma.$queryRaw<{ count: bigint }[]>`
					SELECT COUNT(*)::bigint as count
					FROM "Proposal" p
					WHERE p."status" = 'PUBLISHED'
					AND p."visibility" = 'PUBLIC'
					AND to_tsvector('english',
						COALESCE(p.title, '') || ' ' ||
						COALESCE(p."shortSummary", '') || ' ' ||
						array_to_string(p.keywords, ' ')
					) @@ plainto_tsquery('english', ${input.query})
				`;
				const total = Number(totalRows?.[0]?.count ?? 0);

				// Get ordered ids by relevance with pagination
				const ranked = await prisma.$queryRaw<{ id: string }[]>`
					SELECT p.id
					FROM "Proposal" p
					WHERE p."status" = 'PUBLISHED'
					AND p."visibility" = 'PUBLIC'
					AND to_tsvector('english',
						COALESCE(p.title, '') || ' ' ||
						COALESCE(p."shortSummary", '') || ' ' ||
						array_to_string(p.keywords, ' ')
					) @@ plainto_tsquery('english', ${input.query})
					ORDER BY ts_rank(
						to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p."shortSummary", '') || ' ' || array_to_string(p.keywords, ' ')),
						plainto_tsquery('english', ${input.query})
					) DESC
					LIMIT ${input.pageSize}
					OFFSET ${(input.page - 1) * input.pageSize}
				`;
				const ids = ranked.map(r => r.id);
				if (ids.length === 0) {
					return { items: [], total, page: input.page, pageSize: input.pageSize };
				}
				const itemsRaw = await prisma.proposal.findMany({
					where: { id: { in: ids } },
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							}
						},
						likes: {
							select: {
								userId: true,
							}
						},
						location: true,
						timeline: true,
						contact: true,
						budget: true,
						investor: true,
						mentor: true,
						team: true,
						cofounder: true,
						partner: true,
						customer: true,
					}
				});
				// Preserve relevance order
				const orderMap = new Map<string, number>(
					ids.map((id, idx) => [id, idx] as const)
				  );
				const items = itemsRaw.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
				return { items, total, page: input.page, pageSize: input.pageSize };
			}

			const skip = (input.page - 1) * input.pageSize;
			const take = input.pageSize;
			const [total, items] = await Promise.all([
				prisma.proposal.count({ where }),
				prisma.proposal.findMany({
					where,
					orderBy: input.sortBy === "latest" ? { createdAt: "desc" } : { updatedAt: "desc" },
					skip,
					take,
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
							}
						},
						likes: {
							select: {
								userId: true,
							}
						},
						location: true,
						timeline: true,
						contact: true,
						budget: true,
						investor: true,
						mentor: true,
						team: true,
						cofounder: true,
						partner: true,
						customer: true,
					}
				}),
			]);
			return { items, total, page: input.page, pageSize: input.pageSize };
		}),

	// Interest/Like functionality
	toggleInterest: protectedProcedure
		.input(z.object({ proposalId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			
			// Check if user already liked this proposal
			const existingLike = await prisma.proposalLike.findUnique({
				where: {
					userId_proposalId: {
						userId,
						proposalId: input.proposalId,
					}
				}
			});

			if (existingLike) {
				// Remove like
				await prisma.proposalLike.delete({
					where: {
						userId_proposalId: {
							userId,
							proposalId: input.proposalId,
						}
					}
				});
				return { action: "removed" };
			} else {
				// Add like
				await prisma.proposalLike.create({
					data: {
						userId,
						proposalId: input.proposalId,
					}
				});
				return { action: "added" };
			}
		}),

	// Send request to proposal owner
	sendRequest: protectedProcedure
		.input(z.object({
			proposalId: z.string(),
			proposalOwnerId: z.string(),
			title: z.string().min(1).max(100),
			message: z.string().min(1).max(1000),
			// Optional linkage based on intent/type rules
			projectId: z.string().optional(),
			teamId: z.string().optional(),
			intent: z.enum(["SEEKING","OFFERING"]).optional(),
			roleApplied: z.enum(["INVESTOR","MENTOR","TEAM","COFOUNDER","PARTNER","CUSTOMER"]).optional(),
		}))
        .mutation(async ({ ctx, input }) => {
            await LimitGuard.ensureWithinCreateLimit(ctx.session!.user!.id, 'REQUEST');
			const senderId = ctx.session!.user!.id;
			// Load proposal to validate rules
			const proposal = await prisma.proposal.findUnique({ where: { id: input.proposalId } });
			if (!proposal) {
				throw new Error("Proposal not found");
			}
			const isOffering = (input.intent || proposal.intent) === "OFFERING";
			const typeUpper = (input.roleApplied || proposal.category) as string;
			// Enforce Case 1: offering + type in set -> must include projectId
			const requiresProject = isOffering && ["INVESTOR","MENTOR","COFOUNDER","PARTNER","CUSTOMER","PROJECT"].includes(typeUpper);
			// Enforce Case 2: offering + member -> in our schema, member maps to TEAM
			const requiresTeam = isOffering && (typeUpper === "TEAM");
			if (requiresProject && !input.projectId) {
				throw new Error("projectId is required for this request");
			}
			if (requiresTeam && !input.teamId) {
				throw new Error("teamId is required for this request");
			}

			// Create notification for the proposal owner
			const notification = await prisma.notification.create({
				data: {
					userId: input.proposalOwnerId,
					type: "REQUEST_RECEIVED",
					title: `New Request: ${input.title}`,
					content: input.message,
					relatedId: input.proposalId,
					relatedType: "PROPOSAL",
				}
			});


			// Create request record
			const request = await prisma.request.create({
				data: {
					senderId,
					receiverId: input.proposalOwnerId,
					targetType: requiresTeam ? "TEAM" : (requiresProject ? "PROJECT" : "COLLABORATION"),
					proposalId: input.proposalId,
					message: input.message,
					projectId: input.projectId,
					teamId: input.teamId,
					roleApplied: typeUpper as any,
					status: "PENDING",
				}
			});

			// Update usage for sending a request
			try {
				await UsageManager.updateServiceUsage(
					senderId,
					ctx.session!.user!.name || ctx.session!.user!.email || "",
					"REQUEST" as any,
					1,
					ctx.session!.user!.email || undefined
				);
			} catch (e) {
				console.error("Request usage update failed:", e);
			}


			return { notificationId: notification.id, requestId: request.id };
		})
});
