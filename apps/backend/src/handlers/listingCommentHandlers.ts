import { Socket } from "socket.io";
import { prisma } from "@/lib/prisma";

export function registerListingCommentHandlers(io: any, socket: Socket) {
  socket.on("listing:comment:subscribe", ({ listingId }: { listingId: string }) => {
    if (!listingId) return;
    socket.join(`listing:${listingId}`);
  });

  socket.on("listing:comment:unsubscribe", ({ listingId }: { listingId: string }) => {
    if (!listingId) return;
    socket.leave(`listing:${listingId}`);
  });

  socket.on(
    "listing:comment:create",
    async (data: { listingId: string; content: string; parentId?: string }, callback?: (err?: string, payload?: any) => void) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          callback?.("Unauthorized");
          return;
        }
        const created = await prisma.listingComment.create({
          data: {
            listingId: data.listingId,
            userId,
            parentId: data.parentId,
            content: data.content,
          },
          include: { user: { select: { id: true, name: true, image: true } } },
        });

        io.to(`listing:${data.listingId}`).emit("listing:comment:created", { comment: created });
        callback?.(undefined, { comment: created });
      } catch (error: any) {
        callback?.(error?.message || "Failed to create listing comment");
      }
    }
  );
}

