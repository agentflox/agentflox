/**
 * Thin re-exports so existing imports keep working during migration.
 * @deprecated Import from `@/services/platformHelpers` instead.
 */
export {
  callPlatformHelper,
  type HelperArgs,
  type HelperContext,
  type HelperResult,
} from '@/services/platformHelpers';
