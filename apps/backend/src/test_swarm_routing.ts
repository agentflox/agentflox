import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("Database URL:", process.env.DATABASE_URL);
  
  // Dynamic import after dotenv has been loaded
  const { prisma } = await import("./lib/prisma.js");
  const { openai } = await import("./lib/openai.js");
  
  // Find all active agents in the database first to see what's available
  const allAgents = await prisma.aiAgent.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      agentType: true,
    }
  });

  console.log(`Found ${allAgents.length} total agents in DB:`);
  allAgents.forEach(a => {
    console.log(`- ID: ${a.id}, Name: ${a.name}, Type: ${a.agentType}`);
  });

  if (allAgents.length === 0) {
    console.log("No agents in DB! Cannot test routing.");
    process.exit(0);
  }

  const validAgentIds = allAgents.map(a => a.id);

  // Fetch full profiles
  const agentProfiles = await prisma.aiAgent.findMany({
    where: { id: { in: validAgentIds } },
    select: {
      id: true,
      name: true,
      description: true,
      agentType: true,
      systemPrompt: true,
      capabilities: true,
      tools: {
        select: {
          name: true,
          description: true
        }
      }
    }
  }) as any;

  console.log("\nFetched profiles count:", agentProfiles.length);

  const task = {
    title: "Write blog content",
    description: "Write a high-quality blog post about agentic AI and swarms.",
    priority: "NORMAL"
  };

  const agentNamesMap = agentProfiles.reduce((acc: any, a: any) => ({ ...acc, [a.id]: a.name || `Agent ${a.id.slice(0, 8)}` }), {});

  let targetAgent = validAgentIds[0];
  let routingReason = 'round-robin fallback';
  let coordinatorThinking = `Evaluating best agent for task "${task.title}".`;

  try {
    const prompt = `You are the Coordinator Agent of a multi-agent swarm.
Your job is to assign the following task to the most appropriate agent in the swarm based on their capabilities, descriptions, and tools.

Task to assign:
- Title: ${task.title}
- Description: ${task.description || 'No description'}
- Priority: ${task.priority || 'NORMAL'}

Available Agents in Swarm:
${agentProfiles.map((p: any, idx: number) => `
[Agent #${idx + 1}]
- ID: ${p.id}
- Name: ${p.name}
- Type: ${p.agentType}
- Description: ${p.description || 'No description'}
- Capabilities: ${p.capabilities?.join(', ') || 'None'}
- System Instructions: ${p.systemPrompt || 'None'}
- Available Tools: ${p.tools?.map((t: any) => `${t.name}: ${t.description}`).join(', ') || 'None'}
`).join('\n')}

Analyze the task requirements and match it to the agent whose skills, tools, and description best align with what is needed to complete the task.

You must respond with a JSON object in this exact format:
{
  "selectedAgentId": "ID of the selected agent (must be one of the IDs provided above)",
  "thinking": "Your detailed reasoning explaining why this agent is the best fit, detailing the alignment between the task's needs and the agent's capabilities/tools.",
  "reason": "A brief summary of the routing reason (e.g., 'equipped with blog writing capabilities and SEO tools')"
}
`;

    console.log("\nSending prompt to OpenAI...");
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    console.log("OpenAI raw response content:", content);
    
    const result = JSON.parse(content);
    if (result.selectedAgentId && validAgentIds.includes(result.selectedAgentId)) {
      targetAgent = result.selectedAgentId;
      routingReason = result.reason || `assigned by AI coordinator`;
      coordinatorThinking = result.thinking || `Coordinator selected ${agentNamesMap[targetAgent]}`;
      console.log(`\nSUCCESSFULLY ROUTED!`);
      console.log("Selected Agent:", agentNamesMap[targetAgent]);
      console.log("Thinking:", coordinatorThinking);
      console.log("Reason:", routingReason);
    } else {
      console.log(`\nROUTING FAILED: invalid agent ID: ${result.selectedAgentId}`);
    }
  } catch (err: any) {
    console.error("Error during LLM routing simulation:", err);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
