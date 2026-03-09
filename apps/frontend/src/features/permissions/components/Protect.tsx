import React from 'react';
import { Capability } from '../capabilities';
import { usePermission } from '../hooks/usePermission';

interface ProtectProps {
    permission: Capability;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    context?: any;
}

export const Protect: React.FC<ProtectProps> = ({
    permission,
    children,
    fallback = null,
    context
}) => {
    const hasPermission = usePermission(permission, context);

    if (!hasPermission) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};
