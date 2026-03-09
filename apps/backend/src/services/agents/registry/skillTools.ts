import type { Tool } from '../types/types';

type ToolDefinition = Omit<Tool, 'id'>;

// === CONTENT CREATION TOOLS ===
export const CONTENT_CREATION_TOOLS: ToolDefinition[] = [
    {
        name: 'generateBlogPost',
        description: 'Generate a comprehensive blog post on a specific topic',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'generateBlogPost',
            description: 'Generate a blog post',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'Main topic or title of the blog post' },
                    keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to include' },
                    tone: { type: 'string', description: 'Tone of the post (e.g., professional, casual, informative)' },
                    targetAudience: { type: 'string', description: 'Target audience for the post' },
                    wordCount: { type: 'number', description: 'Approximate word count' },
                },
                required: ['topic'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { topic: 'The Future of AI', tone: 'Inspirational' },
                output: { title: 'The Future of AI', content: '...' },
                description: 'Generate a blog post about AI',
            },
        ],
    },
    {
        name: 'writeScript',
        description: 'Write a script for a video, podcast, or presentation',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'writeScript',
            description: 'Write a script',
            parameters: {
                type: 'object',
                properties: {
                    topic: { type: 'string', description: 'Topic or title of the script' },
                    format: { type: 'string', enum: ['VIDEO', 'PODCAST', 'PRESENTATION'], description: 'Format of the script' },
                    duration: { type: 'string', description: 'Target duration (e.g., "5 minutes")' },
                    keyPoints: { type: 'array', items: { type: 'string' }, description: 'Key points to cover' },
                },
                required: ['topic', 'format'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'createDocumentation',
        description: 'Create technical documentation, user guides, or API references',
        category: 'CONTENT_CREATION',
        isDefault: false,
        functionSchema: {
            name: 'createDocumentation',
            description: 'Create documentation',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string', description: 'Subject of the documentation' },
                    type: { type: 'string', enum: ['USER_GUIDE', 'API_REFERENCE', 'TECHNICAL_SPEC', 'README'], description: 'Type of documentation' },
                    details: { type: 'string', description: 'Detailed information or code to document' },
                },
                required: ['subject', 'type', 'details'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
];

// === CODE OPERATION TOOLS ===
export const CODE_OPERATION_TOOLS: ToolDefinition[] = [
    {
        name: 'writeCode',
        description: 'Generate or modify code based on requirements',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'writeCode',
            description: 'Write code',
            parameters: {
                type: 'object',
                properties: {
                    language: { type: 'string', description: 'Programming language' },
                    description: { type: 'string', description: 'Description of what the code should do' },
                    existingCode: { type: 'string', description: 'Existing code to modify (optional)' },
                    filePath: { type: 'string', description: 'Target file path (optional)' },
                },
                required: ['language', 'description'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'reviewCode',
        description: 'Review code for best practices, bugs, and security issues',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'reviewCode',
            description: 'Review code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code to review' },
                    language: { type: 'string', description: 'Programming language' },
                    context: { type: 'string', description: 'Additional context about the code' },
                },
                required: ['code'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'refactorCode',
        description: 'Refactor code to improve structure, readability, or performance',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'refactorCode',
            description: 'Refactor code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code to refactor' },
                    language: { type: 'string', description: 'Programming language' },
                    goal: { type: 'string', description: 'Goal of the refactoring (e.g., "improve performance", "clean up")' },
                },
                required: ['code', 'goal'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
    {
        name: 'debugCode',
        description: 'Analyze code and error logs to identify and fix bugs',
        category: 'CODE_OPERATIONS',
        isDefault: false,
        functionSchema: {
            name: 'debugCode',
            description: 'Debug code',
            parameters: {
                type: 'object',
                properties: {
                    code: { type: 'string', description: 'Code with issues' },
                    error: { type: 'string', description: 'Error message or log' },
                    language: { type: 'string', description: 'Programming language' },
                },
                required: ['code', 'error'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [],
    },
];

// === BROWSER AUTOMATION TOOLS ===
export const BROWSER_AUTOMATION_TOOLS: ToolDefinition[] = [
    {
        name: 'navigateToUrl',
        description: 'Navigate to a specific URL in a browser environment',
        category: 'BROWSER_AUTOMATION',
        isDefault: false,
        functionSchema: {
            name: 'navigateToUrl',
            description: 'Navigate to URL',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to navigate to' },
                    waitFor: { type: 'string', description: 'Selector to wait for (optional)' },
                },
                required: ['url'],
            },
        },
        deterministic: true,
        requiresAuth: false,
        timeout: 30,
        examples: [],
    },
    {
        name: 'clickElement',
        description: 'Click an element on the current page',
        category: 'BROWSER_AUTOMATION',
        isDefault: false,
        functionSchema: {
            name: 'clickElement',
            description: 'Click element',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of the element to click' },
                    waitForNavigation: { type: 'boolean', description: 'Whether to wait for navigation after click' },
                },
                required: ['selector'],
            },
        },
        deterministic: true,
        requiresAuth: false,
        timeout: 15,
        examples: [],
    },
    {
        name: 'scrapeData',
        description: 'Extract data from the current page',
        category: 'BROWSER_AUTOMATION',
        isDefault: false,
        functionSchema: {
            name: 'scrapeData',
            description: 'Scrape data',
            parameters: {
                type: 'object',
                properties: {
                    selector: { type: 'string', description: 'CSS selector of elements to scrape' },
                    attributes: { type: 'array', items: { type: 'string' }, description: 'Attributes to extract (e.g., "href", "src", "innerText")' },
                },
                required: ['selector'],
            },
        },
        deterministic: true,
        requiresAuth: false,
        timeout: 30,
        examples: [],
    },
    {
        name: 'scrapeWebPage',
        description: 'Extract text and structured data from a specified web page URL',
        category: 'BROWSER_AUTOMATION',
        isDefault: false,
        functionSchema: {
            name: 'scrapeWebPage',
            description: 'Extract text content and structured data from a web page',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'The URL of the web page to scrape' },
                    extractText: { type: 'boolean', description: 'Extract all visible text content (default: true)' },
                    extractLinks: { type: 'boolean', description: 'Extract all hyperlinks on the page (default: false)' },
                    extractImages: { type: 'boolean', description: 'Extract image URLs and alt text (default: false)' },
                    extractMetadata: { type: 'boolean', description: 'Extract page metadata (title, description, og tags) (default: true)' },
                    selectors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', description: 'Label for the extracted data' },
                                selector: { type: 'string', description: 'CSS selector to target specific elements' },
                                attribute: { type: 'string', description: 'HTML attribute to extract (e.g., "href", "src"); defaults to inner text' },
                            },
                        },
                        description: 'Custom CSS selectors to extract specific data fields from the page',
                    },
                    timeout: { type: 'number', description: 'Maximum wait time in milliseconds for page load (default: 15000)' },
                    waitForSelector: { type: 'string', description: 'CSS selector to wait for before scraping (useful for dynamic content)' },
                    format: { type: 'string', enum: ['text', 'markdown', 'json'], description: 'Output format for extracted content (default: text)' },
                },
                required: ['url'],
            },
        },
        deterministic: true,
        requiresAuth: false,
        timeout: 60,
        rateLimit: 20,
        examples: [
            {
                input: { url: 'https://example.com/blog/post-1', extractText: true, extractMetadata: true, format: 'markdown' },
                output: { url: 'https://example.com/blog/post-1', title: 'Example Blog Post', text: '# Example Blog Post\n...', metadata: { description: '...' } },
                description: 'Extract text and metadata from a blog post in markdown format',
            },
        ],
    },
    {
        name: 'crawlWebsite',
        description: 'Crawl multiple pages of a website for comprehensive data gathering',
        category: 'BROWSER_AUTOMATION',
        isDefault: false,
        functionSchema: {
            name: 'crawlWebsite',
            description: 'Crawl multiple pages of a website and extract content from each page',
            parameters: {
                type: 'object',
                properties: {
                    startUrl: { type: 'string', description: 'The starting URL to begin crawling from' },
                    maxPages: { type: 'number', description: 'Maximum number of pages to crawl (default: 10, max: 100)' },
                    maxDepth: { type: 'number', description: 'Maximum link depth to follow from the start URL (default: 2)' },
                    includePaths: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'URL path patterns to include (e.g., ["/blog/", "/docs/"]); crawls all paths if empty',
                    },
                    excludePaths: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'URL path patterns to exclude (e.g., ["/login", "/admin"])',
                    },
                    stayOnDomain: { type: 'boolean', description: 'Only follow links within the same domain (default: true)' },
                    extractText: { type: 'boolean', description: 'Extract visible text from each page (default: true)' },
                    extractLinks: { type: 'boolean', description: 'Extract all hyperlinks found during crawl (default: false)' },
                    extractMetadata: { type: 'boolean', description: 'Extract page metadata from each page (default: true)' },
                    format: { type: 'string', enum: ['text', 'markdown', 'json'], description: 'Output format for extracted content (default: json)' },
                    delayMs: { type: 'number', description: 'Delay in milliseconds between page requests to be polite (default: 500)' },
                    respectRobotsTxt: { type: 'boolean', description: 'Respect the website\'s robots.txt rules (default: true)' },
                },
                required: ['startUrl'],
            },
        },
        deterministic: true,
        requiresAuth: false,
        timeout: 300,
        rateLimit: 5,
        examples: [
            {
                input: { startUrl: 'https://docs.example.com', maxPages: 20, maxDepth: 3, includePaths: ['/docs/'], format: 'markdown' },
                output: { pagesScraped: 18, pages: [{ url: 'https://docs.example.com/docs/intro', title: 'Introduction', content: '...' }], skipped: 2, errors: [] },
                description: 'Crawl a documentation site and extract content from up to 20 pages',
            },
        ],
    },
];

// === MEDIA GENERATION TOOLS ===
export const MEDIA_GENERATION_TOOLS: ToolDefinition[] = [
    {
        name: 'generateImage',
        description: 'Create images using AI models, with options for style and aspect ratio',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'generateImage',
            description: 'Generate image using AI with configurable style and aspect ratio',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Detailed text description of the image to generate' },
                    style: {
                        type: 'string',
                        enum: ['photorealistic', 'cartoon', 'anime', 'oil-painting', 'watercolor', 'sketch', 'digital-art', '3d-render', 'cinematic', 'abstract'],
                        description: 'Visual style of the generated image',
                    },
                    aspectRatio: {
                        type: 'string',
                        enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'],
                        description: 'Aspect ratio of the generated image (default: 1:1)',
                    },
                    size: { type: 'string', enum: ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'], description: 'Pixel dimensions of the image' },
                    negativePrompt: { type: 'string', description: 'Elements to exclude from the image' },
                    numberOfImages: { type: 'number', description: 'Number of images to generate (default: 1, max: 4)' },
                    quality: { type: 'string', enum: ['standard', 'hd'], description: 'Quality level of the generated image (default: standard)' },
                },
                required: ['prompt'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { prompt: 'A futuristic city at sunset', style: 'cinematic', aspectRatio: '16:9' },
                output: { images: [{ url: 'https://...', width: 1792, height: 1024 }], model: 'dall-e-3' },
                description: 'Generate a cinematic wide-angle cityscape',
            },
        ],
    },
    {
        name: 'textToSpeech',
        description: 'Convert text to speech using AI to create audio outputs',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'textToSpeech',
            description: 'Convert text to speech audio using AI voices',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Text content to convert to speech (max 4096 characters)' },
                    voice: {
                        type: 'string',
                        enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                        description: 'AI voice to use for speech synthesis (default: alloy)',
                    },
                    speed: { type: 'number', description: 'Speaking speed multiplier between 0.25 and 4.0 (default: 1.0)' },
                    format: {
                        type: 'string',
                        enum: ['mp3', 'opus', 'aac', 'flac', 'wav'],
                        description: 'Output audio format (default: mp3)',
                    },
                    language: { type: 'string', description: 'Language/locale hint for pronunciation (e.g., "en-US", "fr-FR")' },
                    instructions: { type: 'string', description: 'Additional instructions for tone or speaking style (e.g., "speak slowly and clearly")' },
                },
                required: ['text'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 60,
        examples: [
            {
                input: { text: 'Welcome to Agentflox! Your AI-powered workspace.', voice: 'nova', format: 'mp3', speed: 1.0 },
                output: { audioUrl: 'https://...', format: 'mp3', durationSeconds: 4.2, sizeBytes: 33600 },
                description: 'Convert a welcome message to speech using the nova voice',
            },
        ],
    },
    {
        name: 'generateVideo',
        description: 'Generate a short video based on a text prompt',
        category: 'MEDIA_GENERATION',
        isDefault: false,
        functionSchema: {
            name: 'generateVideo',
            description: 'Generate video',
            parameters: {
                type: 'object',
                properties: {
                    prompt: { type: 'string', description: 'Text description of the video' },
                    duration: { type: 'number', description: 'Duration in seconds' },
                },
                required: ['prompt'],
            },
        },
        deterministic: false,
        requiresAuth: false,
        timeout: 120,
        examples: [],
    },
];

// === FILE OPERATION TOOLS ===
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
