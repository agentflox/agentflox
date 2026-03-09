import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptTemplateService {
    private templates: Map<string, string> = new Map();
    private readonly templateDir = path.join(__dirname, 'templates');

    async loadTemplate(templateName: string): Promise<string> {
        if (this.templates.has(templateName)) {
            return this.templates.get(templateName)!;
        }

        try {
            const filePath = path.join(this.templateDir, `${templateName}.hbs`);
            const content = await fs.readFile(filePath, 'utf-8');
            this.templates.set(templateName, content);
            return content;
        } catch (error) {
            console.error(`Failed to load template ${templateName}:`, error);
            return '';
        }
    }

    render(templateContent: string, variables: Record<string, any>): string {
        return templateContent.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            // Handle simple nested keys like user.name (optional enhancement)
            // For now, simple keys
            return variables[key] !== undefined ? String(variables[key]) : '';
        });
    }

    async loadAndRender(templateName: string, variables: Record<string, any>): Promise<string> {
        const content = await this.loadTemplate(templateName);
        return this.render(content, variables);
    }
}
