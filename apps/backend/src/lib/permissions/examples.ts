/**
 * Permission Resolver - Usage Examples & Best Practices
 * 
 * This file demonstrates how to use the enhanced PermissionResolver
 * with all the new security and performance features.
 */

import { permissionResolver } from './resolver';
import type { ItemType } from './types';

/**
 * Example 1: Basic Permission Check
 */
async function checkUserPermission(userId: string, itemType: ItemType, itemId: string) {
    try {
        const permission = await permissionResolver.resolvePermission(userId, itemType, itemId);

        if (permission) {
            console.log(`User has ${permission} permission`);
        } else {
            console.log('User has no access');
        }

        return permission;
    } catch (error) {
        // Validation errors are thrown, handle them appropriately
        if (error instanceof Error) {
            console.error('Validation error:', error.message);
        }
        return null;
    }
}

/**
 * Example 2: Cache Invalidation After Permission Update
 */
async function updateUserPermission(
    userId: string,
    itemType: ItemType,
    itemId: string,
    newPermission: string
) {
    // Update permission in database
    // await prisma.locationPermission.update(...);

    // Invalidate cache to ensure consistency
    await permissionResolver.invalidatePermissionCache(userId, itemType, itemId);

    console.log('Permission updated and cache invalidated');
}

/**
 * Example 3: Bulk Cache Invalidation When User Role Changes
 */
async function updateUserRole(userId: string, newRole: string) {
    // Update user role in database
    // await prisma.workspaceMember.update(...);

    // Invalidate all permissions for this user
    permissionResolver.invalidateUserPermissions(userId);

    console.log('User role updated, all permissions invalidated');
}

/**
 * Example 4: Invalidate Item Permissions When Item Visibility Changes
 */
async function updateItemVisibility(itemType: ItemType, itemId: string, isPrivate: boolean) {
    // Update item privacy in database
    // await prisma[itemType].update({ where: { id: itemId }, data: { isPrivate } });

    // Invalidate permissions for all users
    permissionResolver.invalidateItemPermissions(itemType, itemId);

    console.log('Item visibility updated, all user permissions invalidated');
}

/**
 * Example 5: Monitoring System Performance
 */
async function monitorPermissionSystem() {
    const metrics = permissionResolver.getMetrics();

    console.log('Permission System Metrics:');
    console.log(`- Cache Hit Rate: ${metrics.cacheHitRate.toFixed(2)}%`);
    console.log(`- Total Resolutions: ${metrics.totalResolutions}`);
    console.log(`- Cache Hits: ${metrics.cacheHits}`);
    console.log(`- Cache Misses: ${metrics.cacheMisses}`);
    console.log(`- Database Queries: ${metrics.databaseQueries}`);
    console.log(`- Average Resolution Time: ${metrics.averageResolutionTime.toFixed(2)}ms`);
    console.log(`- Slow Queries: ${metrics.slowQueries}`);
    console.log(`- Cache Size: ${metrics.cacheSize} items`);

    // Alert if performance is degrading
    if (metrics.cacheHitRate < 50) {
        console.warn('⚠️  Warning: Cache hit rate is below 50%');
    }

    if (metrics.averageResolutionTime > 500) {
        console.warn('⚠️  Warning: Average resolution time is above 500ms');
    }
}

/**
 * Example 6: Health Check for Monitoring Systems
 */
async function checkSystemHealth() {
    const health = await permissionResolver.healthCheck();

    console.log('Permission System Health:');
    console.log(`- Status: ${health.status}`);
    console.log(`- Database Connected: ${health.dbConnected}`);
    console.log(`- Cache Size: ${health.cacheSize}`);

    if (health.status === 'unhealthy') {
        console.error('🔴 CRITICAL: Permission system is unhealthy!');
        // Send alert to operations team
    } else if (health.status === 'degraded') {
        console.warn('🟡 WARNING: Permission system is degraded');
        // Consider scaling or optimizing
    } else {
        console.log('🟢 System is healthy');
    }

    return health;
}

/**
 * Example 7: Batch Permission Checks with Race Condition Protection
 */
async function checkMultiplePermissions(
    userId: string,
    items: Array<{ type: ItemType; id: string }>
) {
    // All these requests will benefit from race condition protection
    // Duplicate requests will reuse the same promise
    const permissionPromises = items.map(item =>
        permissionResolver.resolvePermission(userId, item.type, item.id)
    );

    const permissions = await Promise.all(permissionPromises);

    return items.map((item, index) => ({
        ...item,
        permission: permissions[index],
    }));
}

/**
 * Example 8: Scheduled Metrics Report
 */
async function generateMetricsReport() {
    const health = await permissionResolver.healthCheck();

    const report = {
        timestamp: new Date().toISOString(),
        health: health.status,
        metrics: health.metrics,
        alerts: [] as string[],
    };

    // Check for issues
    if (health.metrics.cacheHitRate < 70) {
        report.alerts.push(`Low cache hit rate: ${health.metrics.cacheHitRate.toFixed(2)}%`);
    }

    if (health.metrics.slowQueries > 10) {
        report.alerts.push(`High number of slow queries: ${health.metrics.slowQueries}`);
    }

    if (!health.dbConnected) {
        report.alerts.push('Database connection failed');
    }

    // Log or send to monitoring system
    console.log(JSON.stringify(report, null, 2));

    return report;
}

/**
 * Example 9: Permission Check with Caching Strategy
 */
async function efficientPermissionCheck(userId: string, itemType: ItemType, itemId: string) {
    // First call: Will query database and cache result
    const perm1 = await permissionResolver.resolvePermission(userId, itemType, itemId);
    console.log('First call (cache miss):', perm1);

    // Second call: Will return from cache (fast!)
    const perm2 = await permissionResolver.resolvePermission(userId, itemType, itemId);
    console.log('Second call (cache hit):', perm2);

    // After 5 minutes (TTL), cache expires and next call queries DB again
}

/**
 * Example 10: Integration with Express Middleware
 */
function createPermissionMiddleware(requiredPermission: 'VIEW' | 'EDIT' | 'FULL') {
    return async (req: any, res: any, next: any) => {
        const { userId } = req.user;
        const { itemType, itemId } = req.params;

        try {
            const permission = await permissionResolver.resolvePermission(
                userId,
                itemType as ItemType,
                itemId
            );

            if (!permission) {
                return res.status(403).json({ error: 'Access denied' });
            }

            // Check if user has required permission level
            const hierarchy = ['VIEW', 'COMMENT', 'EDIT', 'FULL'];
            const userLevel = hierarchy.indexOf(permission);
            const requiredLevel = hierarchy.indexOf(requiredPermission);

            if (userLevel < requiredLevel) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: requiredPermission,
                    actual: permission,
                });
            }

            // Store permission in request for later use
            req.permission = permission;
            next();
        } catch (error) {
            console.error('Permission check failed:', error);
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
}

/**
 * Example 11: Reset Metrics (useful for testing)
 */
function resetSystemMetrics() {
    permissionResolver.resetMetrics();
    console.log('Metrics reset successfully');
}

// Export examples for use in other files
export {
    checkUserPermission,
    updateUserPermission,
    updateUserRole,
    updateItemVisibility,
    monitorPermissionSystem,
    checkSystemHealth,
    checkMultiplePermissions,
    generateMetricsReport,
    efficientPermissionCheck,
    createPermissionMiddleware,
    resetSystemMetrics,
};

/**
 * Best Practices:
 * 
 * 1. Always invalidate cache when permissions change
 * 2. Monitor cache hit rate and adjust TTL if needed
 * 3. Set up health check monitoring in production
 * 4. Enable ENABLE_AUDIT_LOG in production for compliance
 * 5. Review slow query logs regularly
 * 6. Use batch permission checks when possible
 * 7. Never log raw user IDs in production (use masked versions)
 * 8. Set up alerts for degraded system status
 */
