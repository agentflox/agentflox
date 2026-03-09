
import 'dotenv/config';
import { SkillInferenceService } from '../services/agents/inference/skillInferenceService';
import { BUILT_IN_SKILLS } from '../services/agents/registry/skillRegistry';

console.log('Starting Skill Inference Verification...');

async function testInference() {
    try {
        const service = new SkillInferenceService();
        console.log('SkillInferenceService instantiated.');
        console.log(`Loaded ${BUILT_IN_SKILLS.length} built-in skills.`);

        // Test case 1: Content Creation
        const prompt1 = "I need you to write a detailed blog post about the future of AI agents.";
        console.log(`\nTest Case 1: "${prompt1}"`);

        // Check if we can run without API key error
        if (!process.env.OPENAI_API_KEY) {
            console.warn('WARNING: OPENAI_API_KEY not found. Skipping actual API call.');
            return;
        }

        const result1 = await service.inferSkills(
            prompt1,
            "Agent is a helpful assistant.",
            BUILT_IN_SKILLS
        );

        console.log('Result 1:', JSON.stringify(result1, null, 2));

        if (result1.suggestedSkills.includes('content_creation')) {
            console.log('✅ verification PASSED: Detected content_creation');
        } else {
            console.log('❌ verification FAILED: Did not detect content_creation');
        }

        // Test case 2: Browser Automation
        const prompt2 = "Go to github.com and scrape the trending repositories.";
        console.log(`\nTest Case 2: "${prompt2}"`);

        const result2 = await service.inferSkills(
            prompt2,
            "Agent is a researcher.",
            BUILT_IN_SKILLS
        );

        console.log('Result 2:', JSON.stringify(result2, null, 2));

        if (result2.suggestedSkills.includes('browser_automation')) {
            console.log('✅ verification PASSED: Detected browser_automation');
        } else {
            console.log('❌ verification FAILED: Did not detect browser_automation');
        }

    } catch (error) {
        console.error('Check failed:', error);
    }
}

testInference();
