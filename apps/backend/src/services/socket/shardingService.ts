import { createHash } from 'crypto';

/**
 * User Sharding Service
 * Implements consistent hashing for horizontal scalability
 */

export class ShardingService {
    private static readonly NUM_SHARDS = 16; // Default number of shards

    /**
     * Calculate shard ID for a user using consistent hashing
     * Returns a shard number between 0 and NUM_SHARDS-1
     */
    static getUserShard(userId: string, numShards: number = this.NUM_SHARDS): number {
        const hash = createHash('md5').update(userId).digest('hex');
        // Use first 8 characters for 32-bit integer
        const hashInt = parseInt(hash.substring(0, 8), 16);
        return hashInt % numShards;
    }

    /**
     * Get sharded room name for a user
     * Format: shard:{shardId}:user:{userId}
     */
    static getShardedUserRoom(userId: string, numShards?: number): string {
        const shard = this.getUserShard(userId, numShards);
        return `shard:${shard}:user:${userId}`;
    }

    /**
     * Get workspace-scoped room name
     * Format: ws:{workspaceId}:{type}:{id}
     * Provides tenant isolation
     */
    static getWorkspaceRoom(
        workspaceId: string,
        type: 'user' | 'channel' | 'post' | 'project' | 'team',
        id: string
    ): string {
        return `ws:${workspaceId}:${type}:${id}`;
    }

    /**
     * Get sharded + workspace-scoped room name
     * Format: ws:{workspaceId}:shard:{shardId}:user:{userId}
     * Best of both worlds: tenant isolation + horizontal scaling
     */
    static getShardedWorkspaceUserRoom(
        workspaceId: string,
        userId: string,
        numShards?: number
    ): string {
        const shard = this.getUserShard(userId, numShards);
        return `ws:${workspaceId}:shard:${shard}:user:${userId}`;
    }

    /**
     * Parse room name to extract components
     */
    static parseRoomName(room: string): {
        workspaceId?: string;
        shard?: number;
        type?: string;
        id?: string;
    } {
        const parts = room.split(':');

        if (parts[0] === 'ws') {
            // Workspace-scoped room
            if (parts[2] === 'shard') {
                // ws:workspaceId:shard:shardId:type:id
                return {
                    workspaceId: parts[1],
                    shard: parseInt(parts[3]),
                    type: parts[4],
                    id: parts[5],
                };
            } else {
                // ws:workspaceId:type:id
                return {
                    workspaceId: parts[1],
                    type: parts[2],
                    id: parts[3],
                };
            }
        } else if (parts[0] === 'shard') {
            // shard:shardId:type:id
            return {
                shard: parseInt(parts[1]),
                type: parts[2],
                id: parts[3],
            };
        } else {
            // Legacy format: type:id
            return {
                type: parts[0],
                id: parts[1],
            };
        }
    }

    /**
     * Get all shard IDs
     */
    static getAllShards(numShards: number = this.NUM_SHARDS): number[] {
        return Array.from({ length: numShards }, (_, i) => i);
    }

    /**
     * Distribute users across shards evenly
     * Useful for batch operations
     */
    static groupUsersByShard(
        userIds: string[],
        numShards?: number
    ): Map<number, string[]> {
        const shardMap = new Map<number, string[]>();

        for (const userId of userIds) {
            const shard = this.getUserShard(userId, numShards);
            if (!shardMap.has(shard)) {
                shardMap.set(shard, []);
            }
            shardMap.get(shard)!.push(userId);
        }

        return shardMap;
    }
}
