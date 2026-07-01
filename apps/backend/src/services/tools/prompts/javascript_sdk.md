# Relevance AI JavaScript SDK Native Functions & Best Practices

This SDK provides an interface to interact with the Relevance API from within JavaScript steps. It includes native functions, integration classes, and architectural best practices for building robust, production-ready tools across any domain (Marketing, Construction, Code, Video Creation, etc.).

## 1. Native Built-in Helper Functions

### Insert data
\`\`\`javascript
async function insert_data(dataset_id, data)
\`\`\`
Inserts data into a Relevance dataset.
- **dataset_id**: The ID of the dataset to insert into (string).
- **data**: An array of objects containing the data to insert.
- **Returns**: The response from the API as a JSON object.

### Retrieve data
\`\`\`javascript
async function retrieve_data(dataset_id, page_size = null, include_fields = null)
\`\`\`
Retrieves data from a Relevance dataset.
- **dataset_id**: The ID of the dataset to retrieve from (string).
- **page_size**: The number of results to return per page (number, optional).
- **include_fields**: An array of fields to include in the response (array of strings, optional).
- **Returns**: The response from the API as a JSON object.

### Retrieve All Data
\`\`\`javascript
async function retrieve_all(dataset_id, page_size = 1000, include_fields = null)
\`\`\`
Retrieves all data, paginated to handle large datasets.
- **Returns**: An array of objects representing documents.

### Upload a temporary file
\`\`\`javascript
async function insert_temp_file(file_path_or_bytes, ext = null)
\`\`\`
Uploads a temporary file to Relevance.
- **Returns**: An object containing the download URL.

### Prompt completion (LLM Helper)
\`\`\`javascript
async function prompt_completion(prompt, model = null)
\`\`\`
Legacy prompt completion. (For advanced LLM usage, use the `LLM` class below).

### Run a step
\`\`\`javascript
async function run_step(step_name, params)
\`\`\`
Runs another Relevance step programmatically.

---

## 2. Core Classes (LLM, Helper, Integration)

### LLM Integration (AI Analysis)
The `LLM` class is the primary way to interact with AI models (e.g., GPT-4o-mini).
\`\`\`javascript
const response = await LLM("openai-gpt-4.1").chat.completions.create({
    messages: [
        {role: "system", content: "You are a marketing expert."},
        {role: "user", content: prompt}
    ]
});
const analysis = response.choices[0].message.content;
const tokens = response.usage.total_tokens;
\`\`\`

### Global Helpers
The `Helper` class invokes platform-native utilities like web scrapers or PDF extractors.
\`\`\`javascript
// Example: Extract text from PDF
const extraction = await Helper("file_to_text_llm_friendly").call({file_url: params.pdf_url});
const text = extraction.text;

// Example: Google Search (Serper)
const search_results = await Helper("serper_google_search").call({query: "construction trends 2026"});
\`\`\`

### Integration (OAuth & External APIs)
\`\`\`javascript
class Integration {
  constructor(provider_name, account_id)
}
\`\`\`
Handles OAuth token management automatically.
\`\`\`javascript
// Example: Writing to Google Sheets
const account_id = params.google_oauth_account;
const integration = new Integration('google_sheets', account_id);
const response = await integration.api_call(
    'PUT',
    'https://sheets.googleapis.com/v4/spreadsheets/123/values/A1:append?valueInputOption=USER_ENTERED',
    { values: [["Row1 Col1", "Row1 Col2"]] }
);
\`\`\`

---

## 3. Architecture & Best Practices for Production Tools

When writing JavaScript code for a tool step, adhere to these structural patterns to ensure it handles real-world scenarios (Marketing automation, Construction bids analysis, Video script generation, etc.).

### A. Input Access & Validation
Always use the global `params` object to access user inputs and prior step outputs.
\`\`\`javascript
// Direct property access
const domain = params.business_domain;
// Use fallback values for optional fields
const apiKey = params.api_key || "default_key";

// Branching logic based on inputs
let endpoint;
if (domain === "marketing") {
    endpoint = "https://api.marketing.com/v1";
} else if (domain === "construction") {
    endpoint = "https://api.build.com/v1";
} else {
    throw new Error(`Unsupported domain: ${domain}`);
}
\`\`\`

### B. Execution Tracing (CRITICAL)
Always output `<trace>` XML tags via `console.log` so the platform can visualize the execution flow for the user.
\`\`\`javascript
console.log(\`<trace><title>Fetching Data</title><data>\${JSON.stringify({domain})}\</data></trace>\`);
\`\`\`

### C. Loop Processing (Batch Operations)
When processing arrays of data (e.g., multiple leads, multiple documents), iterate and trace progress.
\`\`\`javascript
const dataPoints = params.data_points || [];
const processedData = [];

for (let i = 0; i < dataPoints.length; i++) {
    const item = dataPoints[i];
    console.log(\`<trace><title>Processing item \${i+1}/\${dataPoints.length}</title><data>\${JSON.stringify(item)}</data></trace>\`);
    
    // Process item...
    processedData.push({ item, status: "processed" });
}
\`\`\`

### D. Error Handling
Let critical errors bubble up by not catching them (so the step fails visibly), but handle non-critical API errors gracefully.
\`\`\`javascript
try {
    // Direct access will throw TypeError if nested object is undefined, which is good for debugging
    const criticalValue = responseData.data.key;
} catch (e) {
    console.log(\`<trace><title>Error</title><data>Missing key: \${e.message}</data></trace>\`);
    throw e; // Bubble up
}
\`\`\`

### E. Standardized Return Object
ALWAYS end the step by assigning a comprehensive object to `result`. Do not use `return`.
\`\`\`javascript
result = {
    status: "success",
    execution_summary: {
        domain: domain,
        items_processed: processedData.length
    },
    processed_data: processedData,
    llm_analysis: analysis,
    integrations: {
        google_sheets: sheetsSuccess ? "success" : "failed"
    }
};
\`\`\`

## 4. Comprehensive Template Example
\`\`\`javascript
// 1. Inputs & Validation
const analysisType = params.analysis_type || "market_research";
const dataPoints = params.data_points || [];

console.log(\`<trace><title>Initialization</title><data>\${JSON.stringify({type: analysisType, count: dataPoints.length})}</data></trace>\`);

// 2. Branching & API calls
const apiResults = [];
for (let i = 0; i < dataPoints.length; i++) {
    const point = dataPoints[i];
    if (analysisType === "market_research") {
        // Simulate API/Processing
        apiResults.push(\`Market data for \${point}\`);
    } else {
        apiResults.push(\`General data for \${point}\`);
    }
}

// 3. LLM Integration
const prompt = \`Analyze this data based on \${analysisType}:\\n\${JSON.stringify(apiResults)}\`;
console.log(\`<trace><title>Calling LLM</title><data>\${JSON.stringify({prompt_length: prompt.length})}</data></trace>\`);

const llmResponse = await LLM("openai-gpt-4o-mini").chat.completions.create({
    messages: [{role: "system", content: "You are an expert analyst."}, {role: "user", content: prompt}]
});
const analysis = llmResponse.choices[0].message.content;

// 4. Return Output
result = {
    status: "success",
    data_points_processed: dataPoints.length,
    analysis_type: analysisType,
    analysis: analysis,
    raw_data: apiResults
};
\`\`\`
