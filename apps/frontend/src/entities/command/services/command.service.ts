import axios from 'axios';
import { CommandContext, Suggestion, ParsedCommand } from '../types/command.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002'; // Adjust as needed

export const CommandService = {
    async parse(input: string, context: CommandContext): Promise<ParsedCommand> {
        try {
            const response = await axios.post(`${API_URL}/command/parse`, { input, context });
            return response.data;
        } catch (error) {
            console.error('Failed to parse command:', error);
            // Fallback to local parsing or error
            return { raw: input, type: 'unknown' };
        }
    },

    async getSuggestions(input: string, context: CommandContext): Promise<Suggestion[]> {
        try {
            const response = await axios.post(`${API_URL}/command/suggest`, { input, context });
            return response.data;
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    },

    async execute(input: string, context: CommandContext): Promise<any> {
        return axios.post(`${API_URL}/command/execute`, { input, context }).then(res => res.data);
    }
};
