import { sendBackendRequest } from '@/utils/backend-request';

export interface GenerateProposalResponse {
    detailedDesc: string;
    skills: string[];
    niceToHaveSkills: string[];
    experience: 'Junior' | 'Mid-Level' | 'Senior';
    dueDate?: string;
}

export const aiService = {
    generateProposal: (data: { taskTitle: string; taskDescription?: string; dueDate?: string; projectId?: string; }, session?: any) =>
        sendBackendRequest('/v1/ai/proposal/generate', {
            method: 'POST',
            body: JSON.stringify(data),
        }, session),
};
