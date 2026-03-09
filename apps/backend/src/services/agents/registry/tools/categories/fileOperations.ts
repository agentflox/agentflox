import { ToolDefinition } from '../core/ToolRegistryManager';

export const FILE_OPERATION_TOOLS: ToolDefinition[] = [
    {
        name: 'readFile',
        description: 'Read the contents of a file',
        category: 'FILE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'readFile',
            description: 'Read file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' },
                    encoding: { type: 'string', description: 'File encoding (default: utf-8)' },
                },
                required: ['path'],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 10,
        examples: [],
    },
    {
        name: 'writeFile',
        description: 'Write content to a file',
        category: 'FILE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'writeFile',
            description: 'Write file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' },
                    content: { type: 'string', description: 'Content to write' },
                    overwrite: { type: 'boolean', description: 'Whether to overwrite existing file' },
                },
                required: ['path', 'content'],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 10,
        examples: [],
    },
    {
        name: 'listFiles',
        description: 'List files in a directory',
        category: 'FILE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'listFiles',
            description: 'List files',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Directory path' },
                    recursive: { type: 'boolean', description: 'Whether to list recursively' },
                },
                required: ['path'],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 15,
        examples: [],
    },
    {
        name: 'convertFile',
        description: 'Convert uploaded files to different formats, like PDF, TXT, DOCX, or PNG',
        category: 'FILE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'convertFile',
            description: 'Convert a file from one format to another',
            parameters: {
                type: 'object',
                properties: {
                    sourcePath: { type: 'string', description: 'Path or URL of the source file to convert' },
                    sourceFormat: {
                        type: 'string',
                        enum: ['pdf', 'docx', 'doc', 'txt', 'md', 'html', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'xlsx', 'csv', 'pptx'],
                        description: 'Format of the source file (auto-detected if omitted)',
                    },
                    targetFormat: {
                        type: 'string',
                        enum: ['pdf', 'docx', 'txt', 'md', 'html', 'png', 'jpg', 'webp', 'csv', 'xlsx'],
                        description: 'Target format to convert the file into',
                    },
                    outputPath: { type: 'string', description: 'Destination path for the converted file (optional, auto-generated if omitted)' },
                    quality: { type: 'number', description: 'Output quality for image conversions, 1-100 (default: 90)' },
                    pageRange: { type: 'string', description: 'Page range to convert for multi-page documents, e.g. "1-5" or "2,4,6" (default: all pages)' },
                    preserveFormatting: { type: 'boolean', description: 'Whether to preserve formatting when converting documents (default: true)' },
                    dpi: { type: 'number', description: 'DPI resolution for image output (default: 150)' },
                },
                required: ['sourcePath', 'targetFormat'],
            },
        },
        deterministic: true,
        requiresAuth: true,
        timeout: 120,
        rateLimit: 20,
        examples: [
            {
                input: { sourcePath: '/uploads/report.docx', targetFormat: 'pdf', preserveFormatting: true },
                output: { outputPath: '/converted/report.pdf', sizeBytes: 204800, pages: 12 },
                description: 'Convert a DOCX document to PDF',
            },
            {
                input: { sourcePath: '/uploads/photo.png', targetFormat: 'jpg', quality: 85 },
                output: { outputPath: '/converted/photo.jpg', sizeBytes: 51200, width: 1920, height: 1080 },
                description: 'Convert a PNG image to JPG with 85% quality',
            },
        ],
    },
];
