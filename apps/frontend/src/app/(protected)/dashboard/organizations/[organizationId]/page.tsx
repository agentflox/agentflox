"use client";

import React from 'react';
import { OrganizationView } from '@/features/dashboard/views/organization/OrganizationView';

interface PageProps {
    params: Promise<{
        organizationId: string;
    }>;
}

export default function OrganizationPage({ params }: PageProps) {
    const { organizationId } = React.use(params);
    return <OrganizationView organizationId={organizationId} />;
}
