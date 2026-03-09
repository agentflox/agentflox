export type WorkforceMode = 'FLOW' | 'SWARM';

export type WorkforceStatus = 'ACTIVE' | 'PAUSED' | 'DRAFT' | 'ARCHIVED';

export type WorkforceSummary = {
    id: string;
    name: string;
    description?: string | null;
    mode: WorkforceMode;
    status: WorkforceStatus;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    _count?: {
        agents?: number;
        nodes?: number;
        executions?: number;
    };
};

export type WorkforceScope = 'owned' | 'member' | 'all';

export type WorkforceFilterValues = {
    status?: WorkforceStatus | '';
    mode?: WorkforceMode | '';
};
