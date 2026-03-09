import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    createdAt: string;
    ownerId: string;
    departments?: Department[];
    workspaces?: any[]; // Type properly if needed
    _count?: {
        members: number;
        projects: number;
    };
}

export interface Department {
    id: string;
    name: string;
    description?: string;
    color?: string;
    headId?: string;
    organizationId: string;
    _count?: {
        teams: number;
        projects: number;
        aiAgents: number;
    };
}

export const organizationService = {
    getMyOrganizations: async (): Promise<Organization[]> => {
        const response = await axios.get(`${API_URL}/v1/organizations`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } // Assuming token storage
        });
        return response.data;
    },

    getOrganization: async (id: string): Promise<Organization> => {
        const response = await axios.get(`${API_URL}/v1/organizations/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    createOrganization: async (data: { name: string; slug: string; domain?: string }): Promise<Organization> => {
        const response = await axios.post(`${API_URL}/v1/organizations`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    createDepartment: async (orgId: string, data: { name: string; description?: string; color?: string }) => {
        const response = await axios.post(`${API_URL}/v1/organizations/${orgId}/departments`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    }
};
