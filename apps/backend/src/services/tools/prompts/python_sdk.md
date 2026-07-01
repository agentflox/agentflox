# Relevance AI Python SDK Native Functions & Best Practices

This SDK provides an interface to interact with the Relevance API from within Python steps. It includes native functions, integration classes, and architectural best practices for building robust, production-ready tools across any domain (Marketing, Construction, Code, Video Creation, etc.).

## 1. Native Built-in Helper Functions

### Insert data
\`\`\`python
insert_data(dataset_id: str, data: List[Dict[str, Any]])
\`\`\`
Inserts data into a Relevance dataset.
- **dataset_id**: The ID of the dataset to insert into.
- **data**: A list of dictionaries containing the data to insert.
- **Returns**: The response from the API as a JSON object.

### Retrieve data
\`\`\`python
retrieve_data(dataset_id: str, page_size: int = None, include_fields: List[str] = None)
\`\`\`
Retrieves data from a Relevance dataset.
- **dataset_id**: The ID of the dataset to retrieve from.
- **page_size**: The number of results to return per page (optional).
- **include_fields**: A list of fields to include in the response (optional).
- **Returns**: The response from the API as a JSON object.

### Retrieve All Data
\`\`\`python
retrieve_all(dataset_id: str, page_size: int = 1000, include_fields: List[str] = None) -> List[Dict[str, Any]]
\`\`\`
Retrieves all data, paginated to handle large datasets.
- **Returns**: A list of dictionaries representing documents.

### Upload a temporary file
\`\`\`python
insert_temp_file(file_path_or_bytes: str, ext: str = None)
\`\`\`
Uploads a temporary file to Relevance.
- **Returns**: A dictionary containing the download URL.

### Prompt completion (LLM Helper)
\`\`\`python
prompt_completion(prompt: str, model: int = None)
\`\`\`
Legacy prompt completion. (For advanced LLM usage, use the `LLM` class below).

### Run a step
\`\`\`python
run_step(step_name: str, params: Dict[str, Any])
\`\`\`
Runs another Relevance step programmatically.

---

## 2. Core Classes (LLM, Helper, Integration)

### LLM Integration (AI Analysis)
The `LLM` class is the primary way to interact with AI models (e.g., GPT-4o-mini).
\`\`\`python
response = LLM("openai-gpt-4.1").chat.completions.create(
    messages=[
        {"role": "system", "content": "You are a marketing expert."},
        {"role": "user", "content": prompt}
    ]
)
analysis = response["choices"][0]["message"]["content"]
tokens = response["usage"]["total_tokens"]
\`\`\`

### Global Helpers
The `Helper` class invokes platform-native utilities like web scrapers or PDF extractors.
\`\`\`python
# Example: Extract text from PDF
extraction = Helper("file_to_text_llm_friendly").call(file_url=params['pdf_url'])
text = extraction["text"]

# Example: Google Search (Serper)
search_results = Helper("serper_google_search").call(query="construction trends 2026")
\`\`\`

### Integration (OAuth & External APIs)
\`\`\`python
Integration(provider_name: str, account_id: str)
\`\`\`
Handles OAuth token management automatically.
\`\`\`python
# Example: Writing to Google Sheets
account_id = params.get('google_oauth_account')
integration = Integration('google_sheets', account_id)
response = integration.api_call(
    method='PUT',
    url='https://sheets.googleapis.com/v4/spreadsheets/123/values/A1:append?valueInputOption=USER_ENTERED',
    body={"values": [["Row1 Col1", "Row1 Col2"]]}
)
\`\`\`

---

## 3. Architecture & Best Practices for Production Tools

When writing Python code for a tool step, adhere to these structural patterns to ensure it handles real-world scenarios (Marketing automation, Construction bids analysis, Video script generation, etc.).

### A. Input Access & Validation
Always use the global `params` dictionary to access user inputs and prior step outputs.
\`\`\`python
# Direct key access is preferred when fields are required
domain = params["business_domain"]
# Use .get() with defaults for optional fields
api_key = params.get("api_key", "default_key")

# Branching logic based on inputs
if domain == "marketing":
    endpoint = "https://api.marketing.com/v1"
elif domain == "construction":
    endpoint = "https://api.build.com/v1"
else:
    raise ValueError(f"Unsupported domain: {domain}")
\`\`\`

### B. Execution Tracing (CRITICAL)
Always output `<trace>` XML tags to standard output so the platform can visualize the execution flow for the user.
\`\`\`python
import json
print(f"<trace><title>Fetching Data</title><data>{json.dumps({'domain': domain})}</data></trace>")
\`\`\`

### C. Loop Processing (Batch Operations)
When processing lists of data (e.g., multiple leads, multiple documents), iterate and trace progress.
\`\`\`python
data_points = params.get("data_points", [])
processed_data = []

for index, item in enumerate(data_points):
    print(f"<trace><title>Processing item {index+1}/{len(data_points)}</title><data>{item}</data></trace>")
    
    # Process item...
    result = {"item": item, "status": "processed"}
    processed_data.append(result)
\`\`\`

### D. Error Handling
Let critical errors bubble up by not catching them (so the step fails visibly), but handle non-critical API errors gracefully.
\`\`\`python
try:
    # Direct access will throw KeyError if invalid, which is good for debugging
    critical_value = response_data["data"]["key"]
except KeyError as e:
    print(f"<trace><title>Error</title><data>Missing key: {str(e)}</data></trace>")
    raise # Bubble up
\`\`\`

### E. Standardized Return Object
ALWAYS end the step by assigning a comprehensive dictionary to `result`. Do not use `return`.
\`\`\`python
result = {
    "status": "success",
    "execution_summary": {
        "domain": domain,
        "items_processed": len(processed_data)
    },
    "processed_data": processed_data,
    "llm_analysis": analysis,
    "integrations": {
        "google_sheets": "success" if sheets_success else "failed"
    }
}
\`\`\`

## 4. Comprehensive Template Example
\`\`\`python
import json

# 1. Inputs & Validation
analysis_type = params.get("analysis_type", "market_research")
data_points = params.get("data_points", [])

print(f"<trace><title>Initialization</title><data>{json.dumps({'type': analysis_type, 'count': len(data_points)})}</data></trace>")

# 2. Branching & API calls
api_results = []
for idx, point in enumerate(data_points):
    if analysis_type == "market_research":
        # Simulate API/Processing
        api_results.append(f"Market data for {point}")
    else:
        api_results.append(f"General data for {point}")

# 3. LLM Integration
prompt = f"Analyze this data based on {analysis_type}:\\n{json.dumps(api_results)}"
print(f"<trace><title>Calling LLM</title><data>{{'prompt_length': {len(prompt)}}}</data></trace>")

llm_response = LLM("openai-gpt-4o-mini").chat.completions.create(
    messages=[{"role": "system", "content": "You are an expert analyst."}, {"role": "user", "content": prompt}]
)
analysis = llm_response["choices"][0]["message"]["content"]

# 4. Return Output
result = {
    "status": "success",
    "data_points_processed": len(data_points),
    "analysis_type": analysis_type,
    "analysis": analysis,
    "raw_data": api_results
}
\`\`\`
