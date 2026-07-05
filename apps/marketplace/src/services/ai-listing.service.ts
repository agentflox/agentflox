import { sendBackendRequest } from '@/utils/backend-request';

export interface GenerateListingResponse {
    // Always present
    taskTitle: string;
    detailedDesc: string;
    skills: string[];

    // Asset-only fields (agent, tool, template)
    useCases?: string[];
    intendedUsers?: string[];

    // Opportunity-only fields (task, project, team, talent)
    niceToHaveSkills?: string[];
    experience?: 'Junior' | 'Mid-Level' | 'Senior';
    dueDate?: string;

    // Legacy compat
    description?: string;
}

export const aiListingService = {
    generateListing: (
        data: {
            entityType: string;
            entityId?: string;
            title?: string;
            description?: string;
            dueDate?: string;
        },
        session?: any
    ) =>
        sendBackendRequest(
            '/v1/ai/listing/generate',
            {
                method: 'POST',
                body: JSON.stringify(data),
            },
            session
        ).then(res => res.json()) as Promise<GenerateListingResponse>,
};
