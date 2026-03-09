import { z } from "zod";
import { protectedProcedure, router } from "../init";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@agentflox/database";
import { prisma } from "@/lib/prisma";

export const workforceRouter = router({
    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1, "Name is required"),
            description: z.string().optional(),
            mode: z.enum(["FLOW", "SWARM"]),
            status: z.enum(["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED"]).optional().default("DRAFT"),
        }))
        .mutation(async ({ ctx, input }) => {
            // Find the user's active workspace that they own, or maybe we just use the first workspace they own for now.
            // Usually, there's a workspaceId passed in, but we will grab it from the user's workspaces.
            // For simplicity, let's allow creating and assigning to the first workspace if not provided,
            // or realistically the input should require workspaceId. Let's find the primary workspace.

            const userId = ctx.session.user.id;

            const firstWorkspace = await prisma.workspace.findFirst({
                where: { ownerId: userId, isActive: true }
            });

            if (!firstWorkspace) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "No active workspace found for user",
                });
            }

            const workforce = await prisma.workforce.create({
                data: {
                    name: input.name,
                    description: input.description,
                    mode: input.mode,
                    status: input.status,
                    workspaceId: firstWorkspace.id,
                    createdBy: userId,
                },
            });

            return workforce;
        }),

    list: protectedProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(12),
                query: z.string().optional(),
                scope: z.enum(["owned", "member", "all"]).optional().default("owned"),
                status: z.enum(["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED", ""]).optional() as any,
                mode: z.enum(["FLOW", "SWARM", ""]).optional() as any,
                includeCounts: z.boolean().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, query, status, mode } = input;
            const skip = (page - 1) * pageSize;
            const take = pageSize;
            const userId = ctx.session.user.id;

            const where: Prisma.WorkforceWhereInput = {
                createdBy: userId, // Assuming 'owned' scope maps to creator
            };

            if (query) {
                where.OR = [
                    { name: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                ];
            }

            if (status && status !== "") {
                where.status = status as any;
            }

            if (mode && mode !== "") {
                where.mode = mode as any;
            }

            const [items, total] = await Promise.all([
                prisma.workforce.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { updatedAt: "desc" },
                }),
                prisma.workforce.count({ where }),
            ]);

            // Map to include fake counts as we don't have agents/nodes connected yet
            const itemsWithCounts = items.map((w) => ({
                ...w,
                _count: {
                    agents: 0,
                    nodes: 0,
                    executions: 0
                }
            }));

            return {
                items: itemsWithCounts,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            };
        }),

    get: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const workforce = await prisma.workforce.findUnique({
                where: { id: input.id },
            });

            if (!workforce) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Workforce not found",
                });
            }

            return workforce;
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            mode: z.enum(["FLOW", "SWARM"]).optional(),
            status: z.enum(["ACTIVE", "PAUSED", "DRAFT", "ARCHIVED"]).optional(),
            nodes: z.array(z.any()).optional(),
            edges: z.array(z.any()).optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, nodes, edges, ...rest } = input;

            // Mapping for node types to match user's requested format
            const typeMapping: Record<string, string> = {
                'eventNode': 'trigger',
                'agentNode': 'agent',
                'taskNode': 'task',
                'toolNode': 'tool',
                'conditionNode': 'condition'
            };

            // Transform nodes and edges to user's requested format
            const workforceNodes = nodes?.map(node => ({
                node_id: node.id,
                type: typeMapping[node.type] || node.type?.replace('Node', '').toLowerCase() || 'unknown',
                config: node.data,
                metadata: {
                    position: {
                        x: node.position?.x || 0,
                        y: node.position?.y || 0,
                        z: 1
                    }
                }
            })) || [];

            const workforceEdges = edges?.map(edge => {
                const sourceNode = nodes?.find(n => n.id === edge.source);
                const targetNode = nodes?.find(n => n.id === edge.target);

                return {
                    edge_id: edge.id,
                    source_node_id: edge.source,
                    target_node_id: edge.target,
                    source_type: typeMapping[sourceNode?.type] || sourceNode?.type?.replace('Node', '').toLowerCase() || "unknown",
                    target_type: typeMapping[targetNode?.type] || targetNode?.type?.replace('Node', '').toLowerCase() || "unknown",
                    config: {
                        edge_type: edge.data?.type || "forced-handover",
                        config: {
                            threading_behavior: {
                                type: "always-same"
                            },
                            ...(edge.data || {})
                        }
                    },
                    metadata: {
                        label: edge.data?.label || ""
                    }
                };
            }) || [];

            // Requested JSON structure
            const workforceData = {
                workforce_metadata: {
                    name: input.name || "New workforce",
                    type: "default",
                    last_run_date: new Date().toISOString(),
                    active_version_id: id,
                    user_instructions: nodes?.find(n => n.type === 'eventNode' || n.type === 'triggerNode')?.data?.instructions || "",
                    workforce_graph_link: {
                        content_hash: "",
                        version: 0
                    }
                },
                workforce_graph: {
                    nodes: workforceNodes,
                    edges: workforceEdges
                },
                react_flow_graph: {
                    nodes,
                    edges
                }
            };

            // Use 'any' for data to bypass Prisma type generation delays if still occurring
            const updatedWorkforce = await prisma.workforce.update({
                where: { id },
                data: {
                    ...rest,
                    data: workforceData as any,
                } as any,
            });

            return updatedWorkforce;
        }),
});
