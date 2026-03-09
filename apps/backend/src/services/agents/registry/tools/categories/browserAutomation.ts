import { ToolDefinition } from '../core/ToolRegistryManager';

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
