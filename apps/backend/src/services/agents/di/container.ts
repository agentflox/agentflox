import { ConfigurationValidator } from '../validation/configurationValidator';
import { SafetyEvaluator, PolicyEngine, CapabilityWhitelist, ToolAccessController } from '../safety/safetyEvaluator';
import { PromptSandbox } from '../safety/promptSandbox';
import { AgentVersionControl, ConflictResolver, OptimisticLockManager } from '../versioning/agentVersionControl';
import { AuditLogger } from '../audit/auditLogger';
import { ResponseCache } from '../cache/responseCache';
import { TokenBudgetManager } from '../optimization/tokenBudgetManager';
import { ConfigurationExtractor } from '../extraction/configurationExtractor';
import { AutomationInferrer } from '../inference/automationInferrer';
import { PromptGenerator } from '../generation/promptGenerator';
import { ConfigurationMerger } from '../extraction/configurationMerger';
import { InputSanitizer } from '../safety/inputSanitizer';
import { PermissionService } from '../safety/permissionService';
import { EntityScopeInferrer } from '../context/entityScopeInferrer';
import { StageOrchestrator } from '../orchestration/stageOrchestrator';
import { SimulationService } from '../simulation/simulationService';
import { intentInferenceService } from '../inference/intentInferenceService';
import { AgentBuilderService } from '../arch/agentBuilderService';
import { ConversationStage } from '../state/agentBuilderStateService';

/**
 * Agent Builder Factory
 * 
 * Composition root for the Agent Builder Service.
 * Handles instantiation of all dependencies.
 */
export class AgentBuilderFactory {
    // Singleton instance
    private static instance: AgentBuilderService;

    static getInstance(): AgentBuilderService {
        if (!this.instance) {
            this.instance = this.create();
        }
        return this.instance;
    }

    static create(): AgentBuilderService {
        // 1. Create leaf dependencies
        const validator = new ConfigurationValidator();
        const safetyEvaluator = new SafetyEvaluator();
        const policyEngine = new PolicyEngine();
        const capabilityWhitelist = new CapabilityWhitelist();
        const toolAccessController = new ToolAccessController();
        const promptSandbox = new PromptSandbox();

        // Utilities
        const versionControl = new AgentVersionControl();
        const conflictResolver = new ConflictResolver();
        const lockManager = new OptimisticLockManager();
        const auditLogger = new AuditLogger();
        const responseCache = new ResponseCache();
        const tokenBudgetManager = new TokenBudgetManager();

        // Core Logic Services
        const configurationExtractor = new ConfigurationExtractor();
        const automationInferrer = new AutomationInferrer();
        const promptGenerator = new PromptGenerator();
        const configurationMerger = new ConfigurationMerger();
        const inputSanitizer = new InputSanitizer();
        const permissionService = new PermissionService();
        const entityScopeInferrer = new EntityScopeInferrer();
        const simulationService = new SimulationService();

        // Orchestrator (requires config)
        const STAGE_REQUIREMENTS: Record<ConversationStage, {
            required: string[];
            recommended: string[];
            critical: string[];
        }> = {
            initialization: {
                required: [],
                recommended: [],
                critical: [],
            },
            configuration: {
                required: [],
                recommended: [],
                critical: [],
            },
            launch: {
                required: ['name', 'systemPrompt'],
                recommended: ['description', 'capabilities', 'triggers', 'tools'],
                critical: ['name', 'systemPrompt'],
            },
        };

        const stageOrchestrator = new StageOrchestrator(STAGE_REQUIREMENTS);

        // 2. Inject into AgentBuilderService
        return new AgentBuilderService({
            validator,
            safetyEvaluator,
            policyEngine,
            capabilityWhitelist,
            toolAccessController,
            promptSandbox,
            versionControl,
            conflictResolver,
            lockManager,
            auditLogger,
            responseCache,
            tokenBudgetManager,
            configurationExtractor,
            automationInferrer,
            promptGenerator,
            configurationMerger,
            inputSanitizer,
            permissionService,
            entityScopeInferrer,
            stageOrchestrator,
            simulationService,
            intentInferenceService
        });
    }
}
