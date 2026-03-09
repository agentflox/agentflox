import { SetMetadata } from '@nestjs/common';
import { Capability } from '../../services/permissions/capabilities.constant';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: Capability[]) => SetMetadata(PERMISSIONS_KEY, permissions);
