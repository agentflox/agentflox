-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'LINK', 'OTHER');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'OWNERS_ONLY', 'OWNERS_ADMINS', 'MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('LOCATION', 'DOCUMENT', 'TEMPLATE', 'GUIDE', 'TUTORIAL', 'TOOL', 'ASSET', 'DATASET', 'REFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('FILE', 'LINK', 'EMBEDDED', 'TEXT', 'COLLECTION');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('EMAIL', 'PHONE', 'LINKEDIN', 'TELEGRAM', 'DISCORD');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- CreateEnum
CREATE TYPE "InvestorKind" AS ENUM ('ANGEL', 'VC', 'STRATEGIC', 'CROWDFUNDING', 'GOVERNMENT', 'FAMILY_OFFICE');

-- CreateEnum
CREATE TYPE "MentorDirection" AS ENUM ('SEEKING_MENTOR', 'OFFERING_MENTORSHIP');

-- CreateEnum
CREATE TYPE "MentorCompensation" AS ENUM ('FREE', 'EQUITY', 'ADVISORY_SHARES', 'PAID', 'BARTER');

-- CreateEnum
CREATE TYPE "TeamDirection" AS ENUM ('HIRING', 'SEEKING_POSITION');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "SeniorityLevel" AS ENUM ('INTERN', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD', 'PRINCIPAL', 'DIRECTOR', 'VP', 'C_LEVEL');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('STARTUP_1_10', 'SMALL_11_50', 'MEDIUM_51_200', 'LARGE_201_1000', 'ENTERPRISE_1000_PLUS');

-- CreateEnum
CREATE TYPE "CofounderDirection" AS ENUM ('SEEKING_COFOUNDER', 'OFFERING_COFOUNDING');

-- CreateEnum
CREATE TYPE "PartnerDirection" AS ENUM ('SEEKING_PARTNER', 'OFFERING_PARTNERSHIP');

-- CreateEnum
CREATE TYPE "PartnershipModel" AS ENUM ('REVENUE_SHARE', 'FIXED_FEE', 'COMMISSION_BASED', 'EQUITY_BASED', 'BARTER', 'JOINT_VENTURE');

-- CreateEnum
CREATE TYPE "ExclusivityType" AS ENUM ('EXCLUSIVE', 'NON_EXCLUSIVE', 'SEMI_EXCLUSIVE');

-- CreateEnum
CREATE TYPE "CustomerDirection" AS ENUM ('SELLING', 'BUYING');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('FOUNDER', 'INVESTOR', 'MEMBER', 'HYBRID');

-- CreateEnum
CREATE TYPE "VerificationLevel" AS ENUM ('UNVERIFIED', 'EMAIL_VERIFIED', 'PHONE_VERIFIED', 'IDENTITY_VERIFIED', 'BUSINESS_VERIFIED', 'PREMIUM_VERIFIED');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('ANGEL', 'VC_FUND', 'FAMILY_OFFICE', 'CORPORATE_VC', 'CROWDFUNDING', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Commitment" AS ENUM ('PART_TIME', 'FULL_TIME', 'CONTRACT', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "FundingType" AS ENUM ('EQUITY', 'DEBT', 'GRANT', 'SAFE', 'CONVERTIBLE_NOTE', 'REVENUE_SHARE');

-- CreateEnum
CREATE TYPE "StartupStage" AS ENUM ('IDEA', 'MVP', 'BETA', 'LAUNCHED', 'GROWTH', 'SCALE');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('ONE_OFF', 'ONGOING', 'MENTORSHIP', 'CONSULTING');

-- CreateEnum
CREATE TYPE "PartnershipType" AS ENUM ('STRATEGIC', 'TECHNOLOGY', 'DISTRIBUTION', 'MARKETING', 'JOINT_VENTURE');

-- CreateEnum
CREATE TYPE "PartnershipDuration" AS ENUM ('SHORT_TERM', 'MID_TERM', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'HOURLY', 'SUBSCRIPTION', 'TIERED', 'USAGE_BASED');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IMMEDIATE', 'WITHIN_WEEK', 'WITHIN_MONTH', 'NEGOTIABLE');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('IDEA', 'MVP', 'BETA', 'LAUNCHED', 'GROWTH', 'SCALE', 'EXIT');

-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('DEVELOPMENT', 'MARKETING', 'SALES', 'DESIGN', 'ADVISORY', 'GENERAL');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('CASH_ONLY', 'EQUITY_ONLY', 'CASH_AND_EQUITY', 'DEFERRED_CASH', 'PROFIT_SHARING', 'HOURLY_RATE', 'PROJECT_BASED', 'REVENUE_SHARE');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "AvailabilityType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'CONSULTANT', 'INTERN');

-- CreateEnum
CREATE TYPE "RemotePreference" AS ENUM ('REMOTE_ONLY', 'HYBRID', 'ON_SITE', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('EQUITY', 'CONVERTIBLE_NOTE', 'SAFE', 'DEBT', 'REVENUE_SHARE', 'GRANT');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PROPOSED', 'UNDER_REVIEW', 'DUE_DILIGENCE', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvestmentStage" AS ENUM ('INITIAL', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'BRIDGE', 'MEZZANINE');

-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('INVESTMENT', 'MENTORSHIP', 'TEAM', 'COFOUNDER', 'PARTNERSHIP', 'CUSTOMER', 'MEMBERSHIP');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('INVESTOR', 'MENTOR', 'TEAM', 'COFOUNDER', 'PARTNER', 'CUSTOMER', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RequestTargetType" AS ENUM ('PROJECT', 'TEAM', 'INVESTMENT', 'COLLABORATION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewContextType" AS ENUM ('PROJECT', 'TEAM', 'INVESTMENT', 'GENERAL', 'PROPOSAL');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('IDENTITY', 'EDUCATION', 'WORK_EXPERIENCE', 'COMPANY', 'INVESTOR_ACCREDITATION', 'TECHNICAL_SKILLS');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POST_CREATED', 'POST_LIKED', 'POST_COMMENTED', 'POST_SHARED', 'COMMENT_LIKED', 'COMMENT_REPLIED', 'USER_FOLLOWED', 'MENTION', 'REQUEST_RECEIVED', 'REQUEST_STATUS', 'INVITATION_RECEIVED', 'INVITATION_STATUS', 'MESSAGE_RECEIVED', 'CONNECTION_REQUEST', 'PROJECT_UPDATE', 'INVESTMENT_UPDATE', 'MILESTONE_COMPLETED', 'TEAM_INVITATION', 'REVIEW_RECEIVED', 'VERIFICATION_STATUS', 'SYSTEM_ANNOUNCEMENT', 'USAGE_ALERT', 'FEATURE_UPDATE', 'BILLING', 'MAINTENANCE', 'PAYMENT', 'SUBSCRIPTION', 'USAGE_OVER_LIMIT', 'USAGE_APPROACHING_LIMIT', 'PACKAGE_EXPIRED', 'SUBSCRIPTION_EXPIRED', 'MATCH_FOUND', 'OWNERSHIP_TRANSFER', 'PERMISSION_GRANTED', 'PERMISSION_REVOKED');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'CONNECTIONS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'LOGOUT', 'PROFILE_UPDATE', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'REQUEST_SEND', 'INVESTMENT_PROPOSE', 'MESSAGE_SEND', 'CONNECTION_REQUEST', 'REVIEW_GIVE');

-- CreateEnum
CREATE TYPE "ProposalIntent" AS ENUM ('SEEKING', 'OFFERING');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('POST', 'UPDATE', 'ANNOUNCEMENT', 'MILESTONE', 'MEDIA', 'POLL', 'ARTICLE', 'ACHIEVEMENT', 'DISCUSSION');

-- CreateEnum
CREATE TYPE "PostTopic" AS ENUM ('FEATURE', 'DESIGN', 'IMPLEMENTATION', 'BUG', 'ANNOUNCEMENT', 'ISSUE', 'OTHERS');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'CONNECTIONS', 'TEAM', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('INTERNAL', 'EXTERNAL', 'EMBED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'BOT', 'ADMIN');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTER', 'USER_UPDATE', 'USER_DELETE', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE', 'PROJECT_PUBLISH', 'PROJECT_ARCHIVE', 'PROJECT_TRANSFER', 'TEAM_CREATE', 'TEAM_UPDATE', 'TEAM_DELETE', 'MEMBER_ADD', 'MEMBER_REMOVE', 'MEMBER_BLOCK', 'MEMBER_UNBLOCK', 'MEMBER_ROLE_CHANGE', 'INVESTMENT_PROPOSE', 'INVESTMENT_ACCEPT', 'INVESTMENT_REJECT', 'PROPOSAL_CREATE', 'PROPOSAL_UPDATE', 'PROPOSAL_DELETE', 'PROPOSAL_PUBLISH', 'SYSTEM_MAINTENANCE', 'SYSTEM_UPDATE', 'SYSTEM_ALERT', 'SECURITY_LOGIN_FAILED', 'SECURITY_PASSWORD_CHANGE', 'SECURITY_2FA_ENABLE', 'SECURITY_SUSPICIOUS_ACTIVITY', 'PLAN_HEALED');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('USER', 'PROJECT', 'TEAM', 'INVESTMENT', 'PROPOSAL', 'SYSTEM', 'SECURITY', 'NOTIFICATION', 'PAYMENT', 'CONTENT');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LogVisibility" AS ENUM ('PUBLIC', 'TEAM', 'ADMIN', 'PRIVATE');

-- CreateEnum
CREATE TYPE "MembershipDirection" AS ENUM ('SEEKING_MEMBERSHIP', 'OFFERING_MEMBERSHIP');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW_PROJECT', 'EDIT_PROJECT', 'DELETE_PROJECT', 'MANAGE_MEMBERS', 'MANAGE_FINANCES', 'MANAGE_INVESTORS', 'VIEW_ANALYTICS', 'EDIT_PROFILE', 'MANAGE_REQUESTS', 'MANAGE_INVITATIONS', 'CREATE_UPDATES', 'MANAGE_MILESTONES', 'ADMIN_ACCESS', 'TRANSFER_OWNERSHIP', 'BLOCK_MEMBERS', 'MANAGE_PERMISSIONS');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASIC', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED', 'SUSPENDED', 'EXPIRED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED', 'EXPIRED', 'DENIED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'E_WALLET', 'CRYPTO', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('PAYPAL', 'STRIPE', 'BRAINTREE', 'ADYEN', 'RAZORPAY', 'SQUARE', 'AUTHORIZE_NET', 'OTHER');

-- CreateEnum
CREATE TYPE "Interval" AS ENUM ('EVERY_30_DAYS', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PromotionUnit" AS ENUM ('PERCENTAGE', 'AMOUNT', 'CREDITS', 'DAYS', 'REQUESTS', 'TOKENS');

-- CreateEnum
CREATE TYPE "DiscountUnit" AS ENUM ('PERCENTAGE', 'AMOUNT', 'CREDITS', 'REQUESTS', 'TOKENS');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('SUBSCRIPTION', 'PAY_AS_YOU_GO', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'FROZEN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('PROMOTION', 'DISCOUNT', 'CREDIT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "BillingEventStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED', 'REVERSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_TRIAL', 'USAGE_BOOST', 'CREDIT_BONUS', 'TIME_EXTENSION', 'TIER_UPGRADE', 'EARLY_ADAPTER');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'VOLUME', 'LOYALTY', 'SEASONAL', 'REFERRAL', 'EARLY_ADAPTER', 'BUNDLE');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('GENERAL', 'PROJECT_HELP', 'TEAM_COORDINATION', 'BRAINSTORMING', 'CODE_REVIEW', 'DOCUMENT_QA', 'MENTORSHIP', 'AGENT_BUILDER', 'AGENT_EXECUTOR', 'AGENT_OPERATOR', 'WAR_ROOM');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'FUNCTION');

-- CreateEnum
CREATE TYPE "VectorSourceType" AS ENUM ('PROJECT', 'PROFILE', 'POST', 'DOCUMENT', 'COMMENT', 'PROPOSAL', 'TEAM', 'MESSAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('PRIVATE', 'TEAM', 'PROJECT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'INACCURATE', 'INCOMPLETE', 'HARMFUL', 'BIASED', 'OUTDATED', 'IRRELEVANT', 'TOO_LONG', 'TOO_SHORT');

-- CreateEnum
CREATE TYPE "ShareAccessLevel" AS ENUM ('VIEW', 'COMMENT', 'FULL');

-- CreateEnum
CREATE TYPE "AiActionType" AS ENUM ('CHAT', 'EMBEDDING', 'SEARCH', 'SUMMARIZE', 'ANALYZE', 'GENERATE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'LIMITED_MEMBER', 'LIMITED_MEMBER_VIEW_ONLY', 'GUEST');

-- CreateEnum
CREATE TYPE "SpaceRole" AS ENUM ('ADMIN', 'MEMBER', 'COMMENTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ViewType" AS ENUM ('LIST', 'BOARD', 'CALENDAR', 'GANTT', 'TIMELINE', 'TABLE', 'WORKLOAD', 'MAP', 'MIND_MAP', 'ACTIVITY', 'OVERVIEW', 'DASHBOARD', 'POSTS', 'DISCUSSIONS', 'PROJECTS', 'TEAMS', 'DOCS', 'TASKS', 'CHANNELS', 'PROPOSALS', 'TOOLS', 'MATERIALS', 'DOC', 'FORM', 'WHITEBOARD', 'EMBED', 'SPREADSHEET', 'FILE', 'VIDEO', 'DESIGN', 'LOGS', 'APPEAL', 'GOVERNANCE', 'ANALYTICS', 'WAR_ROOM', 'MARKETPLACE', 'MEMBERS');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'MULTI_SELECT', 'CHECKBOX', 'URL', 'EMAIL', 'PHONE', 'CURRENCY', 'RATING', 'USER', 'LOCATION', 'FORMULA');

-- CreateEnum
CREATE TYPE "CustomFieldScope" AS ENUM ('TASK', 'PROJECT', 'TEAM', 'GOAL');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('OBJECTIVE', 'KEY_RESULT', 'TARGET');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DocumentPermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT', 'ADMIN');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('TASK', 'LIST', 'FOLDER', 'SPACE', 'DOCUMENT', 'DASHBOARD', 'VIEW');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('TASK_OR_SUBTASK_CREATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNEE_ADDED', 'TASK_ASSIGNEE_REMOVED', 'TASK_DUE_DATE_ARRIVES', 'TASK_DUE_DATE_CHANGED', 'TASK_START_DATE_ARRIVES', 'TASK_START_DATE_CHANGED', 'TASK_PRIORITY_CHANGED', 'TASK_NAME_CHANGED', 'TASK_TYPE_CHANGED', 'TASK_LINKED', 'TASK_TIME_TRACKED', 'TASK_UNBLOCKED', 'CUSTOM_FIELD_CHANGED', 'TAG_ADDED', 'TAG_REMOVED', 'CHECKLISTS_RESOLVED', 'SUBTASKS_RESOLVED', 'EXISTING_TASK_ADDED_TO_LOCATION', 'MOVE_TO_LIST', 'DATE_BEFORE_AFTER', 'EVERY_SCHEDULED_TIME', 'CHAT_MESSAGE_POSTED', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SLACK', 'GITHUB', 'GITLAB', 'JIRA', 'TRELLO', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'DROPBOX', 'ZAPIER', 'FIGMA', 'LINEAR', 'NOTION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'TASK_COMPLETED', 'COMMENT_ADDED', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'WORKSPACE_UPDATED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('PUBLIC', 'PRIVATE', 'DIRECT', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ChannelRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ARCHIVED', 'RESTORED', 'SHARED', 'COMMENTED', 'MENTIONED', 'PLAN_HEALED');

-- CreateEnum
CREATE TYPE "TaskAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'PRIORITY_CHANGED', 'DUE_DATE_CHANGED', 'COMPLETED', 'REOPENED', 'ARCHIVED', 'COMMENTED', 'ATTACHED', 'MOVED');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('TASK_LIST', 'TASK_STATS', 'TIME_TRACKING', 'CALENDAR', 'GOALS', 'ACTIVITY_FEED', 'CUSTOM_CHART', 'WORKLOAD', 'BURNDOWN', 'VELOCITY');

-- CreateEnum
CREATE TYPE "ModelName" AS ENUM ('gpt_4', 'gpt_4_32k', 'gpt_4_1106_preview', 'gpt_4_0125_preview', 'gpt_4_turbo', 'gpt_4_turbo_2024_04_09', 'gpt_3_5_turbo', 'gpt_3_5_turbo_16k', 'gpt_3_5_turbo_1106', 'gpt_3_5_turbo_0125', 'gemini_1_0_pro', 'gemini_1_5_pro', 'gemini_1_5_flash', 'dall_e_3', 'gpt_4o', 'gpt_4o_2024_05_13', 'gpt_4o_mini', 'gpt_4o_mini_2024_07_18', 'claude_3_5_sonnet_20240620', 'claude_3_opus_20240229', 'claude_3_sonnet_20240229', 'claude_3_haiku_20240307');

-- CreateEnum
CREATE TYPE "AgentAutonomyLevel" AS ENUM ('SUPERVISED', 'SEMI_AUTONOMOUS', 'AUTONOMOUS', 'COLLABORATIVE');

-- CreateEnum
CREATE TYPE "AgentCollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN', 'OWNER');

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgentExecutionTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'EVENT', 'WEBHOOK', 'API', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AgentMemoryType" AS ENUM ('SHORT_TERM', 'LONG_TERM', 'EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'WORKING');

-- CreateEnum
CREATE TYPE "AgentPermissionLevel" AS ENUM ('RESTRICTED', 'STANDARD', 'ELEVATED', 'ADMIN');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DRAFT', 'BUILDING', 'RECONFIGURING', 'ACTIVE', 'EXECUTING', 'PAUSED', 'DISABLED', 'ARCHIVED', 'ERROR');

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AgentTaskType" AS ENUM ('CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK', 'GENERATE_REPORT', 'ANALYZE_DATA', 'SEND_MESSAGE', 'CREATE_PROJECT', 'UPDATE_PROJECT', 'REVIEW_CODE', 'RUN_TESTS', 'DEPLOY', 'BACKUP', 'SYNC_DATA', 'GENERATE_CONTENT', 'RESEARCH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgentTriggerType" AS ENUM ('SCHEDULED', 'AUTOMATION', 'ASSIGN_TASK', 'DIRECT_MESSAGE', 'MENTION');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('TASK_EXECUTOR', 'WORKFLOW_MANAGER', 'DATA_ANALYST', 'CODE_GENERATOR', 'CONTENT_CREATOR', 'CUSTOMER_SUPPORT', 'RESEARCHER', 'PROJECT_MANAGER', 'QA_TESTER', 'INTEGRATION', 'MONITORING', 'GENERAL_ASSISTANT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('REASONING', 'TOOL_CALL', 'DECISION', 'API_REQUEST', 'DATA_PROCESSING', 'VALIDATION', 'NOTIFICATION', 'WAIT', 'CONDITION', 'LOOP', 'PARALLEL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('SUCCESS', 'FAILED', 'TIMEOUT', 'RATE_LIMITED', 'UNAUTHORIZED', 'NOT_FOUND');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('API', 'DATABASE', 'FILE_SYSTEM', 'EMAIL', 'NOTIFICATION', 'INTEGRATION', 'COMPUTATION', 'SEARCH', 'GENERATION', 'ANALYSIS', 'AUTOMATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VersionChangeType" AS ENUM ('MAJOR', 'MINOR', 'PATCH', 'HOTFIX', 'ROLLBACK');

-- CreateEnum
CREATE TYPE "AgentRelationType" AS ENUM ('SUB_AGENT', 'PEER', 'SUPERVISOR', 'CRITIC');

-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('PERMISSION_CONTROLLED', 'VIEW_ONLY', 'FREE_FOREVER');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('VIEW', 'COMMENT', 'EDIT', 'FULL');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "location" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "user_type" "UserType" NOT NULL DEFAULT 'FOUNDER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,
    "usage_purpose" TEXT,
    "management_goals" TEXT[],
    "referral_source" TEXT,
    "credibility_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verification_level" "VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
    "is_kyc_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_documents" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3),
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "logo" TEXT,
    "domain" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "socialLinks" JSONB,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "head_id" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "avatar" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "organization_id" TEXT,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "member_limit" INTEGER,
    "settings" JSONB,
    "slug" TEXT,
    "storage_limit" BIGINT,
    "storage_used" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "can_create_spaces" BOOLEAN NOT NULL DEFAULT false,
    "can_invite" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_billing" BOOLEAN NOT NULL DEFAULT false,
    "customization" JSONB,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "notification_settings" JSONB,
    "permissions" JSONB,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "custom_role_id" TEXT,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "icon" TEXT,
    "color" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "settings" JSONB,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_integrations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "config" JSONB NOT NULL,
    "encrypted_credentials" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "installed_by" TEXT NOT NULL,
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync_at" TIMESTAMP(3),

    CONSTRAINT "workspace_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL,
    "trigger_data" JSONB NOT NULL,
    "actions_executed" JSONB NOT NULL,
    "error" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "channel_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT,
    "created_by" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "proposal_id" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "task_type_id" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "time_estimate" INTEGER,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'a0',
    "list_id" TEXT,
    "status_id" TEXT,
    "space_id" TEXT,
    "parent_id" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_types" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "space_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "folder_id" TEXT,
    "list_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_statuses" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "space_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "folder_id" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#94A3B8',
    "position" INTEGER NOT NULL DEFAULT 0,
    "type" "StatusType" NOT NULL DEFAULT 'CUSTOM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "type" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignees" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_id" TEXT,
    "agent_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_watchers" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "assignee_id" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "is_running" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "hourly_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_fields" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "config" JSONB,
    "default_value" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "apply_to" "CustomFieldScope"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "custom_field_id" TEXT NOT NULL,
    "task_id" TEXT,
    "project_id" TEXT,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_members" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "SpaceRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "space_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "space_id" TEXT,
    "folder_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "default_view" "ViewType" NOT NULL DEFAULT 'LIST',
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3),
    "project_id" TEXT,
    "team_id" TEXT,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "views" (
    "id" TEXT NOT NULL,
    "list_id" TEXT,
    "folder_id" TEXT,
    "workspace_id" TEXT,
    "space_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ViewType" NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "filters" JSONB,
    "grouping" JSONB,
    "sorting" JSONB,
    "columns" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_autosave" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_shares" (
    "id" TEXT NOT NULL,
    "view_id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_id" TEXT,
    "permission" "ShareAccessLevel" NOT NULL DEFAULT 'VIEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" JSONB NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "position" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GoalType" NOT NULL DEFAULT 'OBJECTIVE',
    "target_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ON_TRACK',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_updates" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "icon" TEXT,
    "cover_image" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_collaborators" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "DocumentPermission" NOT NULL DEFAULT 'VIEW',
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "content" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "allow_reactions" BOOLEAN NOT NULL DEFAULT true,
    "allow_threads" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "topic" TEXT,
    "type" "ChannelType" NOT NULL DEFAULT 'PUBLIC',

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ChannelRole" NOT NULL DEFAULT 'MEMBER',
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "mentions" TEXT[],
    "attachments" JSONB[],
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "reactions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "channel_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_activities" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT,
    "member_id" TEXT,
    "action" "ActivityAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_activities" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "TaskAction" NOT NULL,
    "field" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_analytics" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "tasks_created" INTEGER NOT NULL DEFAULT 0,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "messages_count" INTEGER NOT NULL DEFAULT 0,
    "documents_created" INTEGER NOT NULL DEFAULT 0,
    "total_time_tracked" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "last_ran_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agent_id" UUID,
    "cron_expression" TEXT,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT,
    "space_id" TEXT,
    "team_id" TEXT,
    "timezone" TEXT DEFAULT 'UTC',

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_triggers" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "trigger_type" "AutomationTriggerType" NOT NULL,
    "trigger_config" JSONB NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB,
    "filters" JSONB,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "last_triggered_at" TIMESTAMP(3),
    "trigger_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "automation_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "user_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_experience" INTEGER,
    "previous_exits" TEXT[],
    "linkedin_profile" TEXT,
    "industry_preferences" TEXT[],
    "location_preferences" TEXT[],
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "founder_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "investor_type" "InvestorType" NOT NULL,
    "firm_name" TEXT,
    "investment_range" TEXT,
    "min_investment" DOUBLE PRECISION,
    "max_investment" DOUBLE PRECISION,
    "preferred_stages" "ProjectStage"[],
    "preferred_industries" TEXT[],
    "geographic_focus" TEXT[],
    "investment_thesis" TEXT,
    "value_add_services" TEXT[],
    "portfolio_size" INTEGER DEFAULT 0,
    "successful_exits" INTEGER DEFAULT 0,
    "average_check_size" DOUBLE PRECISION,
    "is_accredited" BOOLEAN NOT NULL DEFAULT false,
    "accreditation_proof" TEXT,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_title" TEXT,
    "experience" INTEGER,
    "current_salary" DOUBLE PRECISION,
    "salary_expectation" DOUBLE PRECISION,
    "availability_type" "AvailabilityType" NOT NULL DEFAULT 'FULL_TIME',
    "hours_per_week" INTEGER,
    "start_date" TIMESTAMP(3),
    "accepts_equity" BOOLEAN NOT NULL DEFAULT true,
    "accepts_cash" BOOLEAN NOT NULL DEFAULT true,
    "accepts_deferred" BOOLEAN NOT NULL DEFAULT false,
    "min_equity_percentage" DOUBLE PRECISION,
    "remote_preference" "RemotePreference" NOT NULL DEFAULT 'HYBRID',
    "role_preferences" TEXT[],
    "industry_preferences" TEXT[],
    "portfolio_url" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "achievements" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_services" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "marketplace_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cap_table_entries" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "class" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cap_table_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_updates" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentiment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "investor_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "organization_id" TEXT,
    "department_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "previous_owner_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tagline" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "stage" "ProjectStage",
    "industry" TEXT[],
    "tags" TEXT[],
    "revenue_model" TEXT[],
    "target_market" TEXT,
    "competitive_edge" TEXT,
    "funding_goal" DOUBLE PRECISION,
    "funding_raised" DOUBLE PRECISION DEFAULT 0,
    "valuation_cap" DOUBLE PRECISION,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "is_hiring" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "is_remote_friendly" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "launched_at" TIMESTAMP(3),
    "transferred_at" TIMESTAMP(3),
    "hiring_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "space_id" TEXT,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "permissions" "Permission"[],
    "is_cofounder" BOOLEAN NOT NULL DEFAULT false,
    "is_investor" BOOLEAN NOT NULL DEFAULT false,
    "is_member" BOOLEAN NOT NULL DEFAULT false,
    "compensation_type" "CompensationType" NOT NULL,
    "salary_amount" DOUBLE PRECISION,
    "equity_percentage" DOUBLE PRECISION,
    "profit_share_percent" DOUBLE PRECISION,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "can_post" BOOLEAN NOT NULL DEFAULT true,
    "can_comment" BOOLEAN NOT NULL DEFAULT true,
    "can_view_project" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMP(3),
    "blocked_by" TEXT,
    "block_reason" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_ownership_transfers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_owner_id" TEXT NOT NULL,
    "to_owner_id" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "requires_acceptance" BOOLEAN NOT NULL DEFAULT true,
    "acceptance_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "project_ownership_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_blocked_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "blocked_by" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "block_post" BOOLEAN NOT NULL DEFAULT true,
    "block_comment" BOOLEAN NOT NULL DEFAULT true,
    "block_view" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblocked_at" TIMESTAMP(3),
    "unblocked_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "project_blocked_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'UPDATE',
    "topic" "PostTopic" NOT NULL DEFAULT 'OTHERS',
    "project_id" TEXT,
    "team_id" TEXT,
    "attachments" TEXT[],
    "tags" TEXT[],
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" UUID,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comment_votes" (
    "id" TEXT NOT NULL,
    "comment_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote_type" "VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comment_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_shares" (
    "id" TEXT NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "comment" TEXT,
    "share_type" "ShareType" NOT NULL DEFAULT 'INTERNAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_type" "ActorType" NOT NULL DEFAULT 'USER',
    "action" "LogAction" NOT NULL,
    "category" "LogCategory" NOT NULL,
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "visibility" "LogVisibility" NOT NULL DEFAULT 'PRIVATE',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "organization_id" TEXT,
    "department_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "avatar" TEXT,
    "teamType" "TeamType" NOT NULL,
    "industry" TEXT[],
    "skills" TEXT[],
    "status" "TeamStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_hiring" BOOLEAN NOT NULL DEFAULT false,
    "size" INTEGER NOT NULL DEFAULT 1,
    "max_size" INTEGER,
    "location" TEXT,
    "is_remote" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "hiring_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "space_id" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_likes" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "permissions" "Permission"[],
    "compensation_type" "CompensationType",
    "salary_amount" DOUBLE PRECISION,
    "equity_percentage" DOUBLE PRECISION,
    "hourly_rate" DOUBLE PRECISION,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_teams" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "investor_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "investment_type" "InvestmentType" NOT NULL,
    "equity_percent" DOUBLE PRECISION,
    "valuation" DOUBLE PRECISION,
    "liquidation_pref" DOUBLE PRECISION DEFAULT 1,
    "antidilution" BOOLEAN NOT NULL DEFAULT false,
    "board_seat" BOOLEAN NOT NULL DEFAULT false,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PROPOSED',
    "stage" "InvestmentStage" NOT NULL DEFAULT 'INITIAL',
    "due_diligence_completed" BOOLEAN NOT NULL DEFAULT false,
    "legal_docs_complete" BOOLEAN NOT NULL DEFAULT false,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "target_type" "RequestTargetType" NOT NULL,
    "project_id" TEXT,
    "team_id" TEXT,
    "proposal_id" TEXT,
    "role" TEXT,
    "message" TEXT NOT NULL,
    "proposed_terms" JSONB,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role_applied" "RoleType",

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "project_id" TEXT,
    "team_id" TEXT,
    "role" TEXT,
    "message" TEXT NOT NULL,
    "terms" JSONB,
    "expires_at" TIMESTAMP(3),
    "response" TEXT,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_type" "RequestTargetType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "giver_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "context_type" "ReviewContextType" NOT NULL,
    "project_id" TEXT,
    "team_id" TEXT,
    "proposal_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "work_quality" INTEGER,
    "communication" INTEGER,
    "reliability" INTEGER,
    "leadership" INTEGER,
    "technical_skills" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "linkedin_profile" TEXT,
    "website_url" TEXT,
    "company_email" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "proficiency" "ProficiencyLevel" NOT NULL,
    "years_of_exp" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_endorsements" (
    "id" TEXT NOT NULL,
    "user_skill_id" TEXT NOT NULL,
    "endorser_id" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "interest_id" TEXT NOT NULL,

    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "participant_ids" UUID[],
    "message_sequence" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID,
    "sender_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "attachments" TEXT[],
    "reply_to_id" UUID,
    "reactions" JSONB NOT NULL DEFAULT '[]',
    "sequence_number" BIGINT,
    "delivery_status" VARCHAR(20) NOT NULL DEFAULT 'PERSISTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_delivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_comments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor_ids" TEXT[],
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "aggregate_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "profile_visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone" BOOLEAN NOT NULL DEFAULT false,
    "allow_messages" BOOLEAN NOT NULL DEFAULT true,
    "allow_connections" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "new_invitation_email" BOOLEAN NOT NULL DEFAULT true,
    "new_message_email" BOOLEAN NOT NULL DEFAULT true,
    "project_update_email" BOOLEAN NOT NULL DEFAULT true,
    "investment_update_email" BOOLEAN NOT NULL DEFAULT true,
    "new_connection_email" BOOLEAN NOT NULL DEFAULT true,
    "weekly_digest_email" BOOLEAN NOT NULL DEFAULT true,
    "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
    "show_in_search" BOOLEAN NOT NULL DEFAULT true,
    "show_in_recommendations" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "new_request_email" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "ActivityType" NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_analytics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "unique_views" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "accepted_apps" INTEGER NOT NULL DEFAULT 0,
    "investment_requests" INTEGER NOT NULL DEFAULT 0,
    "total_funding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "user_id" TEXT NOT NULL,
    "createdBy" VARCHAR(255) NOT NULL,
    "category" "ProposalType" NOT NULL,
    "project_id" TEXT,
    "team_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "shortSummary" VARCHAR(500) NOT NULL,
    "detailedDesc" TEXT NOT NULL,
    "industry" TEXT[],
    "keywords" TEXT[],
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "bookmarks" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT,
    "metaDescription" VARCHAR(160),
    "tags" TEXT[],
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "searchVector" tsvector,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),
    "intent" "ProposalIntent" NOT NULL,
    "space_id" TEXT,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "space_id" TEXT,
    "workspace_id" TEXT,
    "is_for_sale" BOOLEAN NOT NULL DEFAULT false,
    "thumbnail_url" TEXT,
    "status" "MaterialStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_purchases" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "feeUsd" DOUBLE PRECISION NOT NULL,
    "netUsd" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "productUrl" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "space_id" TEXT,
    "workspace_id" TEXT,
    "thumbnail_url" TEXT,
    "fileUrl" TEXT,
    "status" "ToolStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "investment_id" TEXT,
    "verification_request_id" TEXT,
    "filename" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "type" "AttachmentType" NOT NULL,
    "description" VARCHAR(500),
    "language" VARCHAR(5),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "checksum" VARCHAR(64),
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "material_id" TEXT,
    "resource_id" TEXT,
    "tool_id" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "minAmount" DOUBLE PRECISION,
    "maxAmount" DOUBLE PRECISION,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "region" VARCHAR(100),
    "city" VARCHAR(100),
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "hybrid" BOOLEAN NOT NULL DEFAULT false,
    "willRelocate" BOOLEAN NOT NULL DEFAULT false,
    "timeZones" TEXT[],
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timelines" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "duration" TEXT,
    "commitment" "Commitment" NOT NULL,
    "availability" TEXT,
    "urgency" "Urgency" NOT NULL DEFAULT 'MEDIUM',
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "website" VARCHAR(255),
    "linkedin" VARCHAR(255),
    "twitter" VARCHAR(255),
    "github" VARCHAR(255),
    "telegram" VARCHAR(100),
    "discord" VARCHAR(100),
    "preferred_contact" "ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "public_profile" BOOLEAN NOT NULL DEFAULT true,
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_proposals" (
    "id" TEXT NOT NULL,
    "seeking_or_offering" "MembershipDirection" NOT NULL,
    "role_title" VARCHAR(100) NOT NULL,
    "department" VARCHAR(50),
    "custom_role" VARCHAR(100),
    "key_responsibilities" TEXT[],
    "required_skills" TEXT[],
    "preferred_skills" TEXT[],
    "experience_level" "SeniorityLevel",
    "years_experience" INTEGER,
    "compensation_type" "CompensationType",
    "salary_range" JSONB,
    "equity_range" JSONB,
    "benefits" TEXT[],
    "time_commitment" "Commitment",
    "hours_per_week" INTEGER,
    "start_date" TIMESTAMP(3),
    "duration" TEXT,
    "work_arrangement" "WorkArrangement" NOT NULL DEFAULT 'HYBRID',
    "what_offered" TEXT,
    "what_expected" TEXT,
    "project_stage" "StartupStage",
    "team_size" INTEGER,
    "company_values" TEXT[],
    "team_culture" TEXT,
    "current_position" TEXT,
    "portfolio_url" TEXT,
    "availability" "Availability",
    "permissions" "Permission"[],
    "decision_authority" TEXT[],
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "membership_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_proposals" (
    "id" TEXT NOT NULL,
    "funding_needed" DOUBLE PRECISION,
    "funding_type" "FundingType",
    "startup_stage" "StartupStage",
    "current_revenue" DOUBLE PRECISION,
    "projected_revenue" DOUBLE PRECISION,
    "customers" INTEGER,
    "monthly_users" INTEGER,
    "growth_rate" DOUBLE PRECISION,
    "use_of_funds" TEXT,
    "key_metrics" JSONB,
    "team_size" INTEGER,
    "founded_date" TIMESTAMP(3),
    "previous_funding" DOUBLE PRECISION,
    "equity_offered" DOUBLE PRECISION,
    "board_seat" BOOLEAN NOT NULL DEFAULT false,
    "expected_roi" DOUBLE PRECISION,
    "exit_strategy" TEXT,
    "min_investment" DOUBLE PRECISION,
    "max_investment" DOUBLE PRECISION,
    "investor_kind" "InvestorKind"[],
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "investor_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_proposals" (
    "id" TEXT NOT NULL,
    "seeking_or_offering" "MentorDirection" NOT NULL,
    "guidance_areas" TEXT[],
    "specific_challenges" TEXT,
    "current_stage" "StartupStage",
    "preferred_mentor_bg" TEXT[],
    "expertise_areas" TEXT[],
    "years_experience" INTEGER,
    "industries_served" TEXT[],
    "success_stories" TEXT,
    "mentees_criteria" TEXT,
    "preferred_engage" "EngagementType",
    "session_frequency" TEXT,
    "compensation_exp" "MentorCompensation" NOT NULL DEFAULT 'FREE',
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "mentor_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_proposals" (
    "id" TEXT NOT NULL,
    "hiring_or_seeking" "TeamDirection" NOT NULL,
    "role_title" VARCHAR(100) NOT NULL,
    "department" VARCHAR(50),
    "seniority_level" "SeniorityLevel",
    "must_have_skills" TEXT[],
    "nice_to_have_skills" TEXT[],
    "certifications" TEXT[],
    "languages_required" TEXT[],
    "work_arrangement" "WorkArrangement" NOT NULL DEFAULT 'HYBRID',
    "compensation_type" "CompensationType",
    "salary_range" JSONB,
    "benefits" TEXT[],
    "company_size" "CompanySize",
    "company_stage" "StartupStage",
    "team_culture" TEXT,
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "team_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cofounder_proposals" (
    "id" TEXT NOT NULL,
    "seeking_or_offering" "CofounderDirection" NOT NULL,
    "role_title" VARCHAR(100) NOT NULL,
    "key_responsibilities" TEXT[],
    "decision_areas" TEXT[],
    "equity_offered" DOUBLE PRECISION,
    "equity_expected" DOUBLE PRECISION,
    "vesting_schedule" TEXT,
    "time_commitment" TEXT NOT NULL,
    "required_skills" TEXT[],
    "preferred_background" TEXT[],
    "must_have_experience" TEXT[],
    "personality_traits" TEXT[],
    "business_stage" "StartupStage",
    "current_team_size" INTEGER,
    "business_model" TEXT,
    "target_market" TEXT,
    "work_style" TEXT,
    "company_values" TEXT[],
    "conflict_resolution" TEXT,
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "cofounder_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_proposals" (
    "id" TEXT NOT NULL,
    "seeking_or_offering" "PartnerDirection" NOT NULL,
    "partnership_type" "PartnershipType" NOT NULL,
    "value_offered" TEXT NOT NULL,
    "value_expected" TEXT NOT NULL,
    "mutual_benefits" TEXT[],
    "partnership_model" "PartnershipModel",
    "revenue_sharing" DOUBLE PRECISION,
    "exclusivity" "ExclusivityType" NOT NULL DEFAULT 'NON_EXCLUSIVE',
    "partnership_duration" "PartnershipDuration",
    "partner_criteria" TEXT,
    "minimum_requirements" TEXT[],
    "ideal_partner_profile" TEXT,
    "current_partners" INTEGER,
    "market_reach" TEXT[],
    "customer_base" INTEGER,
    "annual_revenue" DOUBLE PRECISION,
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "partner_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_proposals" (
    "id" TEXT NOT NULL,
    "selling_or_buying" "CustomerDirection" NOT NULL,
    "product_service" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100),
    "description" TEXT NOT NULL,
    "pricing_model" "PricingModel",
    "price_range" JSONB,
    "availability" "Availability",
    "delivery_time" TEXT,
    "target_audience" TEXT,
    "customer_benefits" TEXT[],
    "unique_selling_prop" TEXT,
    "requirements" TEXT[],
    "budget_range" JSONB,
    "decision_criteria" TEXT[],
    "timeframe" TEXT,
    "market_size" TEXT,
    "competitors" TEXT[],
    "previous_clients" INTEGER,
    "testimonials" TEXT,
    "support_included" TEXT[],
    "warranty_terms" TEXT,
    "payment_terms" VARCHAR(100),
    "proposal_id" TEXT NOT NULL,

    CONSTRAINT "customer_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "plan_type" "PlanType" NOT NULL,
    "billing_period" "BillingPeriod" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "cappedAmount" INTEGER,
    "creditAmount" INTEGER,
    "stripe_price_id" TEXT,
    "paypal_plan_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "sub_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "package_type" "PackageType" NOT NULL,
    "description" TEXT,
    "credit_amount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "validity_days" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_purchases" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "order_id" TEXT,
    "credit_amount" INTEGER NOT NULL,
    "bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "total_credits" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "credit_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT[],
    "max_projects" INTEGER NOT NULL DEFAULT 0,
    "max_teams" INTEGER NOT NULL DEFAULT 0,
    "max_proposals" INTEGER NOT NULL DEFAULT 0,
    "max_requests" INTEGER NOT NULL DEFAULT 0,
    "max_sp_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_credits" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_project" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_profile" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_proposal" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_team" INTEGER NOT NULL DEFAULT 0,
    "max_rd_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_tokens" INTEGER NOT NULL DEFAULT 0,
    "max_rpm" INTEGER DEFAULT 0,
    "max_rpd" INTEGER DEFAULT 0,
    "max_tpm" INTEGER DEFAULT 0,
    "max_tpd" INTEGER DEFAULT 0,
    "plan_id" TEXT,
    "package_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "max_spaces" INTEGER NOT NULL DEFAULT 0,
    "max_workspaces" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "purchase_id" TEXT,
    "user_id" TEXT NOT NULL,
    "billingType" "BillingType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "adjustedAmount" DOUBLE PRECISION,
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_gateway" "PaymentGateway",
    "failure_reason" TEXT,
    "receipt_url" TEXT,
    "refundId" TEXT,
    "refundReason" TEXT,
    "intentId" TEXT,
    "chargeId" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "creditPurchaseId" TEXT,
    "type" "BillingEventType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "promotionId" TEXT,
    "discountId" TEXT,
    "status" "BillingEventStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAmount" DOUBLE PRECISION,
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" "PromotionUnit" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedToAll" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" "DiscountUnit" NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliedToAll" BOOLEAN NOT NULL DEFAULT false,
    "minimumAmount" DOUBLE PRECISION,
    "maximumAmount" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_to_plan" (
    "discountId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "discount_to_plan_pkey" PRIMARY KEY ("discountId","planId")
);

-- CreateTable
CREATE TABLE "discount_to_package" (
    "discountId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "discount_to_package_pkey" PRIMARY KEY ("discountId","packageId")
);

-- CreateTable
CREATE TABLE "discount_to_user" (
    "discountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "discount_to_user_pkey" PRIMARY KEY ("discountId","userId")
);

-- CreateTable
CREATE TABLE "promotion_to_user" (
    "promotionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "promotion_to_user_pkey" PRIMARY KEY ("promotionId","userId")
);

-- CreateTable
CREATE TABLE "promotion_to_plan" (
    "promotionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,

    CONSTRAINT "promotion_to_plan_pkey" PRIMARY KEY ("promotionId","planId")
);

-- CreateTable
CREATE TABLE "promotion_to_package" (
    "promotionId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,

    CONSTRAINT "promotion_to_package_pkey" PRIMARY KEY ("promotionId","packageId")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscription_id" TEXT,
    "credit_purchase_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "max_projects" INTEGER NOT NULL DEFAULT 0,
    "remaining_projects" INTEGER NOT NULL DEFAULT 0,
    "max_teams" INTEGER NOT NULL DEFAULT 0,
    "remaining_teams" INTEGER NOT NULL DEFAULT 0,
    "max_proposals" INTEGER NOT NULL DEFAULT 0,
    "remaining_proposals" INTEGER NOT NULL DEFAULT 0,
    "max_requests" INTEGER NOT NULL DEFAULT 0,
    "remaining_requests" INTEGER NOT NULL DEFAULT 0,
    "max_sp_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_sp_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_rd_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_rd_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_tokens" INTEGER NOT NULL DEFAULT 0,
    "input_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "output_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "remaining_tokens" INTEGER NOT NULL DEFAULT 0,
    "chat_requests_made)" INTEGER NOT NULL DEFAULT 0,
    "max_credits" INTEGER NOT NULL DEFAULT 0,
    "remaining_credits" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_project" INTEGER NOT NULL DEFAULT 0,
    "remaining_chats_per_project" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_profile" INTEGER NOT NULL DEFAULT 0,
    "remaining_chats_per_profile" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_proposal" INTEGER NOT NULL DEFAULT 0,
    "remaining_chats_per_proposal" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_team" INTEGER NOT NULL DEFAULT 0,
    "remaining_chats_per_team" INTEGER NOT NULL DEFAULT 0,
    "max_spaces" INTEGER NOT NULL DEFAULT 0,
    "max_workspaces" INTEGER NOT NULL DEFAULT 0,
    "remaining_spaces" INTEGER NOT NULL DEFAULT 0,
    "remaining_workspaces" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_quotas" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "max_projects" INTEGER NOT NULL DEFAULT 0,
    "max_teams" INTEGER NOT NULL DEFAULT 0,
    "max_proposals" INTEGER NOT NULL DEFAULT 0,
    "max_requests" INTEGER NOT NULL DEFAULT 0,
    "max_sp_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_rd_storage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_credits" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_project" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_profile" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_proposal" INTEGER NOT NULL DEFAULT 0,
    "max_chats_per_team" INTEGER NOT NULL DEFAULT 0,
    "max_tokens" INTEGER NOT NULL DEFAULT 0,
    "max_rpm" INTEGER DEFAULT 0,
    "max_rpd" INTEGER DEFAULT 0,
    "max_tpm" INTEGER DEFAULT 0,
    "max_tpd" INTEGER DEFAULT 0,
    "total_projects_created" INTEGER NOT NULL DEFAULT 0,
    "total_teams_created" INTEGER NOT NULL DEFAULT 0,
    "total_proposals_created" INTEGER NOT NULL DEFAULT 0,
    "total_requests_sent" INTEGER NOT NULL DEFAULT 0,
    "total_tokens_all_time" INTEGER NOT NULL DEFAULT 0,
    "total_credits_all_time" INTEGER NOT NULL DEFAULT 0,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "last_reset_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" "WebhookEvent"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay" INTEGER NOT NULL DEFAULT 60,
    "last_triggered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "http_status" INTEGER,
    "response" TEXT,
    "error" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_queue" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "webhook_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "conversation_type" "ConversationType" NOT NULL DEFAULT 'GENERAL',
    "project_id" TEXT,
    "proposal_id" TEXT,
    "team_id" TEXT,
    "system_prompt" TEXT,
    "model_id" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "channel_id" TEXT,
    "space_id" TEXT,
    "workspace_id" TEXT,
    "task_id" TEXT,
    "list_id" TEXT,
    "folder_id" TEXT,
    "agent_id" UUID,
    "metadata" JSONB,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokens_used" INTEGER,
    "model" TEXT,
    "finish_reason" TEXT,
    "context_used" JSONB,
    "search_query" TEXT,
    "relevance_scores" JSONB,
    "attachments" JSONB,
    "image_urls" TEXT[],
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" TEXT NOT NULL,
    "name" "ModelName" NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "maxTokens" INTEGER,
    "temperature" DOUBLE PRECISION,
    "RPM" INTEGER,
    "RPD" INTEGER,
    "TPM" INTEGER,
    "TPD" INTEGER,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vector_embeddings" (
    "id" TEXT NOT NULL,
    "source_type" "VectorSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "user_id" TEXT,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" JSONB,
    "embedding_model" TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
    "dimension" INTEGER NOT NULL DEFAULT 1536,
    "chunk_index" INTEGER,
    "total_chunks" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "access_level" "AccessLevel" NOT NULL DEFAULT 'PRIVATE',
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vector_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message_feedback" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER,
    "is_helpful" BOOLEAN,
    "is_accurate" BOOLEAN,
    "is_safe" BOOLEAN,
    "feedback_type" "FeedbackType",
    "comment" TEXT,
    "categories" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_message_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation_feedback" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER,
    "was_helpful" BOOLEAN,
    "goal_achieved" BOOLEAN,
    "comment" TEXT,
    "suggestions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation_shares" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "shared_by" TEXT NOT NULL,
    "shared_with" TEXT,
    "share_token" TEXT NOT NULL,
    "access_level" "ShareAccessLevel" NOT NULL DEFAULT 'VIEW',
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message_annotations" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_index" INTEGER NOT NULL,
    "end_index" INTEGER NOT NULL,
    "highlighted_text" TEXT NOT NULL,
    "note" TEXT,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "action" "AiActionType" NOT NULL,
    "model" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION,
    "request_duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "space_id" TEXT,
    "parent_id" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "excerpt" VARCHAR(500),
    "content" JSONB,
    "category" "ResourceCategory" NOT NULL DEFAULT 'OTHER',
    "type" "ResourceType" NOT NULL DEFAULT 'TEXT',
    "tags" TEXT[],
    "price_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "requires_auth" BOOLEAN NOT NULL DEFAULT true,
    "status" "ResourceStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "meta_title" VARCHAR(255),
    "meta_description" VARCHAR(500),
    "keywords" TEXT[],
    "external_url" TEXT,
    "source_url" TEXT,
    "documentation_url" TEXT,
    "thumbnail_url" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION,
    "metadata" JSONB,
    "settings" JSONB,
    "license" VARCHAR(100),
    "attribution" TEXT,
    "copyright_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "last_viewed_at" TIMESTAMP(3),
    "file_mime_type" TEXT,
    "file_name" TEXT,
    "file_size" BIGINT,
    "file_url" TEXT,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_comments" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_ratings" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_bookmarks" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_shares" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shared_with" TEXT,
    "share_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_permissions" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT,
    "role_id" TEXT,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_versions" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "change_log" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_collaborators" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "AgentCollaboratorRole" NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_execute" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_execution_steps" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "step_type" "StepType" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "reasoning" TEXT,
    "confidence" DOUBLE PRECISION,
    "tool_used" TEXT,
    "action" TEXT,
    "parameters" JSONB,
    "status" "StepStatus" NOT NULL,
    "error" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "agent_execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "triggered_by" "AgentExecutionTrigger" NOT NULL,
    "trigger_user_id" TEXT,
    "trigger_event_id" TEXT,
    "trigger_data" JSONB,
    "execution_context" JSONB,
    "input_data" JSONB,
    "output_data" JSONB,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "completed_steps" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "AgentExecutionStatus" NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "error_code" TEXT,
    "error_stack" TEXT,
    "reasoning" JSONB[],
    "decisions_count" INTEGER NOT NULL DEFAULT 0,
    "tool_calls_count" INTEGER NOT NULL DEFAULT 0,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approval_status" "ApprovalStatus",
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_feedback" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "execution_id" TEXT,
    "user_id" TEXT NOT NULL,
    "feedback_type" "FeedbackType" NOT NULL,
    "overall_rating" INTEGER,
    "accuracy_rating" INTEGER,
    "speed_rating" INTEGER,
    "helpfulness_rating" INTEGER,
    "comment" TEXT,
    "suggestions" TEXT,
    "issue_categories" TEXT[],
    "context" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "memory_type" "AgentMemoryType" NOT NULL,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "context_type" TEXT,
    "context_id" TEXT,
    "associated_data" JSONB,
    "embedding" JSONB,
    "embedding_model" TEXT,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_schedules" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "repeat_time" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "instructions" TEXT,
    "context" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_runs" INTEGER,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "agent_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_triggers" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "trigger_type" "AgentTriggerType" NOT NULL,
    "trigger_config" JSONB NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB,
    "filters" JSONB,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "last_triggered_at" TIMESTAMP(3),
    "trigger_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agent_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "task_type" "AgentTaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "input_data" JSONB,
    "context" JSONB,
    "requirements" TEXT[],
    "constraints" TEXT[],
    "scheduled_for" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "recurrence" TEXT,
    "assigned_by" TEXT,
    "assigned_to" TEXT[],
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "depends_on" TEXT[],
    "blocked_by" TEXT[],
    "execution_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_attempt_at" TIMESTAMP(3),
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tool_calls" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "status" "ToolCallStatus" NOT NULL,
    "error" TEXT,
    "error_code" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "agent_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tools" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tool_type" "ToolType" NOT NULL,
    "category" TEXT NOT NULL,
    "endpoint" TEXT,
    "method" TEXT,
    "headers" JSONB,
    "authentication" JSONB,
    "function_schema" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "returns" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "requires_auth" BOOLEAN NOT NULL DEFAULT false,
    "rate_limit" INTEGER,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "retry_on_error" BOOLEAN NOT NULL DEFAULT true,
    "cost_per_call" DOUBLE PRECISION,
    "monthly_quota" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "examples" JSONB[],
    "documentation" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" TEXT NOT NULL,
    "agent_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "change_log" TEXT,
    "changed_by" TEXT NOT NULL,
    "change_type" "VersionChangeType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "diff" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "integrity" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" TEXT,
    "organization_id" TEXT,
    "department_id" TEXT,
    "space_id" TEXT,
    "project_id" TEXT,
    "team_id" TEXT,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "agent_type" "AgentType" NOT NULL DEFAULT 'TASK_EXECUTOR',
    "system_prompt" TEXT NOT NULL,
    "personality" JSONB,
    "capabilities" TEXT[],
    "constraints" TEXT[],
    "model_id" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 2000,
    "top_p" DOUBLE PRECISION DEFAULT 1.0,
    "frequency_penalty" DOUBLE PRECISION DEFAULT 0.0,
    "presence_penalty" DOUBLE PRECISION DEFAULT 0.0,
    "max_iterations" INTEGER NOT NULL DEFAULT 10,
    "max_execution_time" INTEGER NOT NULL DEFAULT 300,
    "auto_retry" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay" INTEGER NOT NULL DEFAULT 5,
    "memory_type" "AgentMemoryType" NOT NULL DEFAULT 'SHORT_TERM',
    "context_window" INTEGER NOT NULL DEFAULT 5,
    "use_vector_memory" BOOLEAN NOT NULL DEFAULT false,
    "memory_retention" INTEGER DEFAULT 7,
    "autonomy_level" "AgentAutonomyLevel" NOT NULL DEFAULT 'SEMI_AUTONOMOUS',
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "approval_threshold" DOUBLE PRECISION DEFAULT 0.8,
    "available_tools" TEXT[],
    "allowed_resources" JSONB,
    "permission_level" "AgentPermissionLevel" NOT NULL DEFAULT 'RESTRICTED',
    "schedule" TEXT,
    "is_schedule_active" BOOLEAN NOT NULL DEFAULT false,
    "workflow" JSONB,
    "fallback_behavior" JSONB,
    "error_handling" JSONB,
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "total_executions" INTEGER NOT NULL DEFAULT 0,
    "successful_runs" INTEGER NOT NULL DEFAULT 0,
    "failed_runs" INTEGER NOT NULL DEFAULT 0,
    "average_run_time" DOUBLE PRECISION,
    "total_tokens_used" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'OWNERS_ADMINS',
    "tags" TEXT[],
    "metadata" JSONB,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_executed_at" TIMESTAMP(3),
    "last_modified_by" TEXT,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "function_schema" JSONB NOT NULL,
    "deterministic" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "requires_auth" BOOLEAN NOT NULL DEFAULT false,
    "rate_limit" INTEGER,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "examples" JSONB[],
    "documentation" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "system_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "child_id" UUID NOT NULL,
    "type" "AgentRelationType" NOT NULL DEFAULT 'SUB_AGENT',
    "router_config" JSONB,
    "share_memory" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_templates" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "created_by" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "categories" TEXT[],
    "capabilities" JSONB NOT NULL,
    "instructions" TEXT NOT NULL,
    "triggers" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "embedding" vector,
    "embedding_updated_at" TIMESTAMP(3),

    CONSTRAINT "agent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_guests" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guest_type" "GuestType" NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_permissions" (
    "id" TEXT NOT NULL,
    "location_type" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_id" TEXT,
    "permission" "PermissionLevel" NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_permissions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_id" TEXT,
    "permission" "PermissionLevel" NOT NULL,
    "granted_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_role" "WorkspaceRole" NOT NULL,
    "permissions" JSONB NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "invited_by_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invited_user_id" TEXT,
    "invite_type" TEXT NOT NULL,
    "role" "WorkspaceRole",
    "target_type" TEXT,
    "target_id" TEXT,
    "permission" "PermissionLevel",
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMP(3),
    "cancelled_by_id" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_links" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "location_type" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "permission" "PermissionLevel" NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "public_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspaces_organization_id_idx" ON "workspaces"("organization_id");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_is_active_is_archived_idx" ON "workspaces"("is_active", "is_archived");

-- CreateIndex
CREATE INDEX "workspaces_created_at_idx" ON "workspaces"("created_at");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_status_idx" ON "workspace_members"("status");

-- CreateIndex
CREATE INDEX "workspace_members_role_idx" ON "workspace_members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_idx" ON "workspace_invitations"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");

-- CreateIndex
CREATE INDEX "workspace_invitations_token_idx" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_expires_at_idx" ON "workspace_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "spaces_workspace_id_idx" ON "spaces"("workspace_id");

-- CreateIndex
CREATE INDEX "spaces_is_active_idx" ON "spaces"("is_active");

-- CreateIndex
CREATE INDEX "workspace_integrations_workspace_id_idx" ON "workspace_integrations"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_integrations_provider_idx" ON "workspace_integrations"("provider");

-- CreateIndex
CREATE INDEX "automation_logs_automation_id_idx" ON "automation_logs"("automation_id");

-- CreateIndex
CREATE INDEX "automation_logs_executed_at_idx" ON "automation_logs"("executed_at");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_proposal_id_key" ON "tasks"("proposal_id");

-- CreateIndex
CREATE INDEX "tasks_workspace_id_idx" ON "tasks"("workspace_id");

-- CreateIndex
CREATE INDEX "tasks_list_id_idx" ON "tasks"("list_id");

-- CreateIndex
CREATE INDEX "tasks_status_id_idx" ON "tasks"("status_id");

-- CreateIndex
CREATE INDEX "tasks_channel_id_idx" ON "tasks"("channel_id");

-- CreateIndex
CREATE INDEX "tasks_project_id_idx" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "tasks_team_id_idx" ON "tasks"("team_id");

-- CreateIndex
CREATE INDEX "tasks_created_by_idx" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_idx" ON "tasks"("assignee_id");

-- CreateIndex
CREATE INDEX "tasks_parent_id_idx" ON "tasks"("parent_id");

-- CreateIndex
CREATE INDEX "tasks_parent_id_position_idx" ON "tasks"("parent_id", "position");

-- CreateIndex
CREATE INDEX "task_types_workspace_id_idx" ON "task_types"("workspace_id");

-- CreateIndex
CREATE INDEX "task_types_space_id_idx" ON "task_types"("space_id");

-- CreateIndex
CREATE INDEX "task_types_project_id_idx" ON "task_types"("project_id");

-- CreateIndex
CREATE INDEX "task_types_team_id_idx" ON "task_types"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_types_workspace_id_name_key" ON "task_types"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "task_statuses_list_id_idx" ON "task_statuses"("list_id");

-- CreateIndex
CREATE INDEX "task_statuses_folder_id_idx" ON "task_statuses"("folder_id");

-- CreateIndex
CREATE INDEX "task_statuses_workspace_id_idx" ON "task_statuses"("workspace_id");

-- CreateIndex
CREATE INDEX "task_statuses_space_id_idx" ON "task_statuses"("space_id");

-- CreateIndex
CREATE INDEX "task_statuses_project_id_idx" ON "task_statuses"("project_id");

-- CreateIndex
CREATE INDEX "task_statuses_team_id_idx" ON "task_statuses"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_statuses_workspace_id_name_key" ON "task_statuses"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "task_dependencies_depends_on_id_idx" ON "task_dependencies"("depends_on_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_depends_on_id_key" ON "task_dependencies"("task_id", "depends_on_id");

-- CreateIndex
CREATE INDEX "task_assignees_user_id_idx" ON "task_assignees"("user_id");

-- CreateIndex
CREATE INDEX "task_assignees_task_id_idx" ON "task_assignees"("task_id");

-- CreateIndex
CREATE INDEX "task_assignees_agent_id_idx" ON "task_assignees"("agent_id");

-- CreateIndex
CREATE INDEX "task_assignees_team_id_idx" ON "task_assignees"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_task_id_user_id_key" ON "task_assignees"("task_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_task_id_agent_id_key" ON "task_assignees"("task_id", "agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_task_id_team_id_key" ON "task_assignees"("task_id", "team_id");

-- CreateIndex
CREATE INDEX "task_watchers_user_id_idx" ON "task_watchers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_watchers_task_id_user_id_key" ON "task_watchers"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "task_comments_task_id_idx" ON "task_comments"("task_id");

-- CreateIndex
CREATE INDEX "task_comments_user_id_idx" ON "task_comments"("user_id");

-- CreateIndex
CREATE INDEX "task_comments_parent_id_idx" ON "task_comments"("parent_id");

-- CreateIndex
CREATE INDEX "task_attachments_task_id_idx" ON "task_attachments"("task_id");

-- CreateIndex
CREATE INDEX "checklists_task_id_idx" ON "checklists"("task_id");

-- CreateIndex
CREATE INDEX "checklist_items_checklist_id_idx" ON "checklist_items"("checklist_id");

-- CreateIndex
CREATE INDEX "time_entries_task_id_idx" ON "time_entries"("task_id");

-- CreateIndex
CREATE INDEX "time_entries_user_id_idx" ON "time_entries"("user_id");

-- CreateIndex
CREATE INDEX "time_entries_start_time_idx" ON "time_entries"("start_time");

-- CreateIndex
CREATE INDEX "custom_fields_workspace_id_idx" ON "custom_fields"("workspace_id");

-- CreateIndex
CREATE INDEX "custom_field_values_custom_field_id_idx" ON "custom_field_values"("custom_field_id");

-- CreateIndex
CREATE INDEX "custom_field_values_task_id_idx" ON "custom_field_values"("task_id");

-- CreateIndex
CREATE INDEX "custom_field_values_project_id_idx" ON "custom_field_values"("project_id");

-- CreateIndex
CREATE INDEX "space_members_user_id_idx" ON "space_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_members_space_id_user_id_key" ON "space_members"("space_id", "user_id");

-- CreateIndex
CREATE INDEX "folders_workspace_id_idx" ON "folders"("workspace_id");

-- CreateIndex
CREATE INDEX "folders_space_id_idx" ON "folders"("space_id");

-- CreateIndex
CREATE INDEX "folders_project_id_idx" ON "folders"("project_id");

-- CreateIndex
CREATE INDEX "folders_team_id_idx" ON "folders"("team_id");

-- CreateIndex
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");

-- CreateIndex
CREATE INDEX "folders_is_archived_idx" ON "folders"("is_archived");

-- CreateIndex
CREATE INDEX "lists_workspace_id_idx" ON "lists"("workspace_id");

-- CreateIndex
CREATE INDEX "lists_space_id_idx" ON "lists"("space_id");

-- CreateIndex
CREATE INDEX "lists_folder_id_idx" ON "lists"("folder_id");

-- CreateIndex
CREATE INDEX "lists_is_archived_idx" ON "lists"("is_archived");

-- CreateIndex
CREATE INDEX "views_list_id_idx" ON "views"("list_id");

-- CreateIndex
CREATE INDEX "views_folder_id_idx" ON "views"("folder_id");

-- CreateIndex
CREATE INDEX "views_space_id_idx" ON "views"("space_id");

-- CreateIndex
CREATE INDEX "views_project_id_idx" ON "views"("project_id");

-- CreateIndex
CREATE INDEX "views_team_id_idx" ON "views"("team_id");

-- CreateIndex
CREATE INDEX "views_created_by_idx" ON "views"("created_by");

-- CreateIndex
CREATE INDEX "view_shares_view_id_idx" ON "view_shares"("view_id");

-- CreateIndex
CREATE INDEX "view_shares_user_id_idx" ON "view_shares"("user_id");

-- CreateIndex
CREATE INDEX "view_shares_team_id_idx" ON "view_shares"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "view_shares_view_id_user_id_key" ON "view_shares"("view_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "view_shares_view_id_team_id_key" ON "view_shares"("view_id", "team_id");

-- CreateIndex
CREATE INDEX "dashboards_workspace_id_idx" ON "dashboards"("workspace_id");

-- CreateIndex
CREATE INDEX "dashboards_created_by_idx" ON "dashboards"("created_by");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "goals_workspace_id_idx" ON "goals"("workspace_id");

-- CreateIndex
CREATE INDEX "goals_owner_id_idx" ON "goals"("owner_id");

-- CreateIndex
CREATE INDEX "goals_parent_id_idx" ON "goals"("parent_id");

-- CreateIndex
CREATE INDEX "goals_due_date_idx" ON "goals"("due_date");

-- CreateIndex
CREATE INDEX "goal_updates_goal_id_idx" ON "goal_updates"("goal_id");

-- CreateIndex
CREATE INDEX "documents_workspace_id_idx" ON "documents"("workspace_id");

-- CreateIndex
CREATE INDEX "documents_created_by_idx" ON "documents"("created_by");

-- CreateIndex
CREATE INDEX "documents_parent_id_idx" ON "documents"("parent_id");

-- CreateIndex
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");

-- CreateIndex
CREATE INDEX "document_collaborators_user_id_idx" ON "document_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_collaborators_document_id_user_id_key" ON "document_collaborators"("document_id", "user_id");

-- CreateIndex
CREATE INDEX "templates_workspace_id_idx" ON "templates"("workspace_id");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "channels_workspace_id_idx" ON "channels"("workspace_id");

-- CreateIndex
CREATE INDEX "channels_type_idx" ON "channels"("type");

-- CreateIndex
CREATE INDEX "channels_is_archived_idx" ON "channels"("is_archived");

-- CreateIndex
CREATE INDEX "channel_members_user_id_idx" ON "channel_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_members_channel_id_user_id_key" ON "channel_members"("channel_id", "user_id");

-- CreateIndex
CREATE INDEX "channel_messages_channel_id_idx" ON "channel_messages"("channel_id");

-- CreateIndex
CREATE INDEX "channel_messages_user_id_idx" ON "channel_messages"("user_id");

-- CreateIndex
CREATE INDEX "channel_messages_parent_id_idx" ON "channel_messages"("parent_id");

-- CreateIndex
CREATE INDEX "channel_messages_created_at_idx" ON "channel_messages"("created_at");

-- CreateIndex
CREATE INDEX "workspace_activities_workspace_id_idx" ON "workspace_activities"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_activities_user_id_idx" ON "workspace_activities"("user_id");

-- CreateIndex
CREATE INDEX "workspace_activities_entity_type_entity_id_idx" ON "workspace_activities"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "workspace_activities_created_at_idx" ON "workspace_activities"("created_at");

-- CreateIndex
CREATE INDEX "task_activities_task_id_idx" ON "task_activities"("task_id");

-- CreateIndex
CREATE INDEX "task_activities_user_id_idx" ON "task_activities"("user_id");

-- CreateIndex
CREATE INDEX "task_activities_created_at_idx" ON "task_activities"("created_at");

-- CreateIndex
CREATE INDEX "workspace_analytics_date_idx" ON "workspace_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_analytics_workspace_id_date_key" ON "workspace_analytics"("workspace_id", "date");

-- CreateIndex
CREATE INDEX "automations_workspace_id_idx" ON "automations"("workspace_id");

-- CreateIndex
CREATE INDEX "automations_is_active_idx" ON "automations"("is_active");

-- CreateIndex
CREATE INDEX "automations_created_by_idx" ON "automations"("created_by");

-- CreateIndex
CREATE INDEX "automations_agent_id_idx" ON "automations"("agent_id");

-- CreateIndex
CREATE INDEX "automations_project_id_idx" ON "automations"("project_id");

-- CreateIndex
CREATE INDEX "automations_space_id_idx" ON "automations"("space_id");

-- CreateIndex
CREATE INDEX "automations_team_id_idx" ON "automations"("team_id");

-- CreateIndex
CREATE INDEX "automation_triggers_automation_id_idx" ON "automation_triggers"("automation_id");

-- CreateIndex
CREATE INDEX "automation_triggers_trigger_type_idx" ON "automation_triggers"("trigger_type");

-- CreateIndex
CREATE INDEX "automation_triggers_is_active_idx" ON "automation_triggers"("is_active");

-- CreateIndex
CREATE INDEX "automation_triggers_priority_idx" ON "automation_triggers"("priority");

-- CreateIndex
CREATE INDEX "automation_triggers_last_triggered_at_idx" ON "automation_triggers"("last_triggered_at");

-- CreateIndex
CREATE INDEX "user_likes_target_user_id_idx" ON "user_likes"("target_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_likes_user_id_target_user_id_key" ON "user_likes"("user_id", "target_user_id");

-- CreateIndex
CREATE INDEX "user_comments_target_user_id_idx" ON "user_comments"("target_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "founder_profiles_user_id_key" ON "founder_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "investor_profiles_user_id_key" ON "investor_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_profiles_user_id_key" ON "member_profiles"("user_id");

-- CreateIndex
CREATE INDEX "projects_space_id_idx" ON "projects"("space_id");

-- CreateIndex
CREATE INDEX "project_members_is_blocked_idx" ON "project_members"("is_blocked");

-- CreateIndex
CREATE INDEX "project_members_status_idx" ON "project_members"("status");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_ownership_transfers_acceptance_token_key" ON "project_ownership_transfers"("acceptance_token");

-- CreateIndex
CREATE INDEX "project_ownership_transfers_project_id_idx" ON "project_ownership_transfers"("project_id");

-- CreateIndex
CREATE INDEX "project_ownership_transfers_from_owner_id_idx" ON "project_ownership_transfers"("from_owner_id");

-- CreateIndex
CREATE INDEX "project_ownership_transfers_to_owner_id_idx" ON "project_ownership_transfers"("to_owner_id");

-- CreateIndex
CREATE INDEX "project_ownership_transfers_status_idx" ON "project_ownership_transfers"("status");

-- CreateIndex
CREATE INDEX "project_blocked_members_project_id_idx" ON "project_blocked_members"("project_id");

-- CreateIndex
CREATE INDEX "project_blocked_members_user_id_idx" ON "project_blocked_members"("user_id");

-- CreateIndex
CREATE INDEX "project_blocked_members_is_active_idx" ON "project_blocked_members"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "project_blocked_members_project_id_user_id_is_active_key" ON "project_blocked_members"("project_id", "user_id", "is_active");

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_project_id_idx" ON "posts"("project_id");

-- CreateIndex
CREATE INDEX "posts_team_id_idx" ON "posts"("team_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_visibility_created_at_idx" ON "posts"("visibility", "created_at");

-- CreateIndex
CREATE INDEX "post_likes_user_id_idx" ON "post_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "post_comments_post_id_idx" ON "post_comments"("post_id");

-- CreateIndex
CREATE INDEX "post_comments_user_id_idx" ON "post_comments"("user_id");

-- CreateIndex
CREATE INDEX "post_comments_parent_id_idx" ON "post_comments"("parent_id");

-- CreateIndex
CREATE INDEX "post_comments_created_at_idx" ON "post_comments"("created_at");

-- CreateIndex
CREATE INDEX "post_comment_votes_user_id_idx" ON "post_comment_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_comment_votes_comment_id_user_id_key" ON "post_comment_votes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "post_shares_post_id_idx" ON "post_shares"("post_id");

-- CreateIndex
CREATE INDEX "post_shares_user_id_idx" ON "post_shares"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_project_id_idx" ON "activity_logs"("project_id");

-- CreateIndex
CREATE INDEX "activity_logs_team_id_idx" ON "activity_logs"("team_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_category_idx" ON "activity_logs"("action", "category");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_entity_id_idx" ON "activity_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "teams_space_id_idx" ON "teams"("space_id");

-- CreateIndex
CREATE INDEX "team_likes_user_id_idx" ON "team_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_likes_team_id_user_id_key" ON "team_likes"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_teams_project_id_team_id_key" ON "project_teams"("project_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_giver_id_receiver_id_context_type_project_id_team_i_key" ON "reviews"("giver_id", "receiver_id", "context_type", "project_id", "team_id", "proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_endorsements_user_skill_id_endorser_id_key" ON "skill_endorsements"("user_skill_id", "endorser_id");

-- CreateIndex
CREATE UNIQUE INDEX "interests_name_key" ON "interests"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_interests_user_id_interest_id_key" ON "user_interests"("user_id", "interest_id");

-- CreateIndex
CREATE UNIQUE INDEX "connections_requester_id_receiver_id_key" ON "connections"("requester_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant_ids_key" ON "conversations"("participant_ids");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sequence_number_idx" ON "messages"("conversation_id", "sequence_number");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_receiver_id_created_at_idx" ON "messages"("receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_receiver_id_is_read_idx" ON "messages"("receiver_id", "is_read");

-- CreateIndex
CREATE INDEX "message_delivery_user_id_status_idx" ON "message_delivery"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "message_delivery_message_id_user_id_key" ON "message_delivery"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_likes_user_id_project_id_key" ON "project_likes"("user_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_likes_user_id_proposal_id_key" ON "proposal_likes"("user_id", "proposal_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_analytics_project_id_date_key" ON "project_analytics"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "proposals_user_id_idx" ON "proposals"("user_id");

-- CreateIndex
CREATE INDEX "proposals_project_id_idx" ON "proposals"("project_id");

-- CreateIndex
CREATE INDEX "proposals_team_id_idx" ON "proposals"("team_id");

-- CreateIndex
CREATE INDEX "proposals_category_intent_status_created_at_idx" ON "proposals"("category", "intent", "status", "created_at");

-- CreateIndex
CREATE INDEX "proposals_industry_idx" ON "proposals"("industry");

-- CreateIndex
CREATE INDEX "proposals_slug_idx" ON "proposals"("slug");

-- CreateIndex
CREATE INDEX "materials_workspace_id_idx" ON "materials"("workspace_id");

-- CreateIndex
CREATE INDEX "materials_space_id_idx" ON "materials"("space_id");

-- CreateIndex
CREATE INDEX "materials_owner_id_idx" ON "materials"("owner_id");

-- CreateIndex
CREATE INDEX "material_purchases_buyer_id_idx" ON "material_purchases"("buyer_id");

-- CreateIndex
CREATE INDEX "tools_workspace_id_idx" ON "tools"("workspace_id");

-- CreateIndex
CREATE INDEX "tools_space_id_idx" ON "tools"("space_id");

-- CreateIndex
CREATE INDEX "tools_owner_id_idx" ON "tools"("owner_id");

-- CreateIndex
CREATE INDEX "payouts_user_id_idx" ON "payouts"("user_id");

-- CreateIndex
CREATE INDEX "attachments_proposal_id_idx" ON "attachments"("proposal_id");

-- CreateIndex
CREATE INDEX "attachments_type_idx" ON "attachments"("type");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_proposal_id_key" ON "budgets"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_proposal_id_key" ON "locations"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "timelines_proposal_id_key" ON "timelines"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_proposal_id_key" ON "contacts"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_proposals_proposal_id_key" ON "membership_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "investor_proposals_proposal_id_key" ON "investor_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_proposals_proposal_id_key" ON "mentor_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_proposals_proposal_id_key" ON "team_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "cofounder_proposals_proposal_id_key" ON "cofounder_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_proposals_proposal_id_key" ON "partner_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_proposals_proposal_id_key" ON "customer_proposals"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plans_stripe_price_id_key" ON "plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_paypal_plan_id_key" ON "plans"("paypal_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_sub_id_key" ON "subscriptions"("sub_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "credit_packages_name_key" ON "credit_packages"("name");

-- CreateIndex
CREATE UNIQUE INDEX "credit_purchases_order_id_key" ON "credit_purchases"("order_id");

-- CreateIndex
CREATE INDEX "credit_purchases_user_id_idx" ON "credit_purchases"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "features_plan_id_key" ON "features"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "features_package_id_key" ON "features"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_subscription_id_key" ON "payments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_purchase_id_key" ON "payments"("purchase_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE INDEX "payments_purchase_id_idx" ON "payments"("purchase_id");

-- CreateIndex
CREATE INDEX "billing_events_subscriptionId_idx" ON "billing_events"("subscriptionId");

-- CreateIndex
CREATE INDEX "billing_events_creditPurchaseId_idx" ON "billing_events"("creditPurchaseId");

-- CreateIndex
CREATE INDEX "billing_events_status_idx" ON "billing_events"("status");

-- CreateIndex
CREATE INDEX "billing_events_startDate_endDate_idx" ON "billing_events"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "promotion_isActive_idx" ON "promotion"("isActive");

-- CreateIndex
CREATE INDEX "promotion_validFrom_validUntil_idx" ON "promotion"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_isActive_idx" ON "discount"("isActive");

-- CreateIndex
CREATE INDEX "discount_validFrom_validUntil_idx" ON "discount"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_to_plan_planId_idx" ON "discount_to_plan"("planId");

-- CreateIndex
CREATE INDEX "discount_to_package_packageId_idx" ON "discount_to_package"("packageId");

-- CreateIndex
CREATE INDEX "discount_to_user_userId_idx" ON "discount_to_user"("userId");

-- CreateIndex
CREATE INDEX "promotion_to_user_userId_idx" ON "promotion_to_user"("userId");

-- CreateIndex
CREATE INDEX "promotion_to_plan_planId_idx" ON "promotion_to_plan"("planId");

-- CreateIndex
CREATE INDEX "promotion_to_package_packageId_idx" ON "promotion_to_package"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_subscription_id_key" ON "usage"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_credit_purchase_id_key" ON "usage"("credit_purchase_id");

-- CreateIndex
CREATE INDEX "usage_userId_idx" ON "usage"("userId");

-- CreateIndex
CREATE INDEX "usage_createdAt_idx" ON "usage"("createdAt");

-- CreateIndex
CREATE INDEX "usage_updatedAt_idx" ON "usage"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_quotas_user_id_key" ON "user_quotas"("user_id");

-- CreateIndex
CREATE INDEX "user_quotas_user_id_idx" ON "user_quotas"("user_id");

-- CreateIndex
CREATE INDEX "user_quotas_updated_at_idx" ON "user_quotas"("updated_at");

-- CreateIndex
CREATE INDEX "webhooks_workspace_id_idx" ON "webhooks"("workspace_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at");

-- CreateIndex
CREATE INDEX "webhook_logs_userId_idx" ON "webhook_logs"("userId");

-- CreateIndex
CREATE INDEX "webhook_logs_topic_idx" ON "webhook_logs"("topic");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_queue_status_attempts_idx" ON "webhook_queue"("status", "attempts");

-- CreateIndex
CREATE INDEX "webhook_queue_userId_idx" ON "webhook_queue"("userId");

-- CreateIndex
CREATE INDEX "webhook_queue_status_nextRetryAt_idx" ON "webhook_queue"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "webhook_queue_createdAt_idx" ON "webhook_queue"("createdAt");

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_created_at_idx" ON "ai_conversations"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_conversations_project_id_idx" ON "ai_conversations"("project_id");

-- CreateIndex
CREATE INDEX "ai_conversations_team_id_idx" ON "ai_conversations"("team_id");

-- CreateIndex
CREATE INDEX "ai_conversations_is_active_is_archived_idx" ON "ai_conversations"("is_active", "is_archived");

-- CreateIndex
CREATE INDEX "ai_conversations_workspace_id_idx" ON "ai_conversations"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_conversations_space_id_idx" ON "ai_conversations"("space_id");

-- CreateIndex
CREATE INDEX "ai_conversations_channel_id_idx" ON "ai_conversations"("channel_id");

-- CreateIndex
CREATE INDEX "ai_conversations_task_id_idx" ON "ai_conversations"("task_id");

-- CreateIndex
CREATE INDEX "ai_conversations_list_id_idx" ON "ai_conversations"("list_id");

-- CreateIndex
CREATE INDEX "ai_conversations_folder_id_idx" ON "ai_conversations"("folder_id");

-- CreateIndex
CREATE INDEX "ai_conversations_agent_id_idx" ON "ai_conversations"("agent_id");

-- CreateIndex
CREATE INDEX "ai_conversations_conversation_type_idx" ON "ai_conversations"("conversation_type");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_created_at_idx" ON "ai_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_messages_role_idx" ON "ai_messages"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_name_key" ON "ai_models"("name");

-- CreateIndex
CREATE INDEX "vector_embeddings_source_type_source_id_idx" ON "vector_embeddings"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "vector_embeddings_user_id_idx" ON "vector_embeddings"("user_id");

-- CreateIndex
CREATE INDEX "vector_embeddings_content_hash_idx" ON "vector_embeddings"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "vector_embeddings_source_type_source_id_chunk_index_key" ON "vector_embeddings"("source_type", "source_id", "chunk_index");

-- CreateIndex
CREATE INDEX "ai_message_feedback_message_id_idx" ON "ai_message_feedback"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_message_feedback_message_id_user_id_key" ON "ai_message_feedback"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_conversation_feedback_conversation_id_user_id_key" ON "ai_conversation_feedback"("conversation_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_conversation_shares_share_token_key" ON "ai_conversation_shares"("share_token");

-- CreateIndex
CREATE INDEX "ai_conversation_shares_conversation_id_idx" ON "ai_conversation_shares"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_conversation_shares_share_token_idx" ON "ai_conversation_shares"("share_token");

-- CreateIndex
CREATE INDEX "ai_message_annotations_message_id_idx" ON "ai_message_annotations"("message_id");

-- CreateIndex
CREATE INDEX "ai_usage_logs_user_id_created_at_idx" ON "ai_usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_usage_logs_conversation_id_idx" ON "ai_usage_logs"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "resources_slug_key" ON "resources"("slug");

-- CreateIndex
CREATE INDEX "resources_owner_id_idx" ON "resources"("owner_id");

-- CreateIndex
CREATE INDEX "resources_workspace_id_idx" ON "resources"("workspace_id");

-- CreateIndex
CREATE INDEX "resources_space_id_idx" ON "resources"("space_id");

-- CreateIndex
CREATE INDEX "resources_parent_id_idx" ON "resources"("parent_id");

-- CreateIndex
CREATE INDEX "resources_status_idx" ON "resources"("status");

-- CreateIndex
CREATE INDEX "resources_category_idx" ON "resources"("category");

-- CreateIndex
CREATE INDEX "resources_type_idx" ON "resources"("type");

-- CreateIndex
CREATE INDEX "resources_slug_idx" ON "resources"("slug");

-- CreateIndex
CREATE INDEX "resources_is_featured_idx" ON "resources"("is_featured");

-- CreateIndex
CREATE INDEX "resources_is_premium_idx" ON "resources"("is_premium");

-- CreateIndex
CREATE INDEX "resources_created_at_idx" ON "resources"("created_at");

-- CreateIndex
CREATE INDEX "resources_published_at_idx" ON "resources"("published_at");

-- CreateIndex
CREATE INDEX "resources_tags_idx" ON "resources"("tags");

-- CreateIndex
CREATE INDEX "resources_title_idx" ON "resources"("title");

-- CreateIndex
CREATE INDEX "resources_description_idx" ON "resources"("description");

-- CreateIndex
CREATE INDEX "resource_comments_resource_id_idx" ON "resource_comments"("resource_id");

-- CreateIndex
CREATE INDEX "resource_comments_user_id_idx" ON "resource_comments"("user_id");

-- CreateIndex
CREATE INDEX "resource_comments_parent_id_idx" ON "resource_comments"("parent_id");

-- CreateIndex
CREATE INDEX "resource_ratings_resource_id_idx" ON "resource_ratings"("resource_id");

-- CreateIndex
CREATE INDEX "resource_ratings_user_id_idx" ON "resource_ratings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_ratings_resource_id_user_id_key" ON "resource_ratings"("resource_id", "user_id");

-- CreateIndex
CREATE INDEX "resource_bookmarks_resource_id_idx" ON "resource_bookmarks"("resource_id");

-- CreateIndex
CREATE INDEX "resource_bookmarks_user_id_idx" ON "resource_bookmarks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_bookmarks_resource_id_user_id_key" ON "resource_bookmarks"("resource_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_shares_share_token_key" ON "resource_shares"("share_token");

-- CreateIndex
CREATE INDEX "resource_shares_resource_id_idx" ON "resource_shares"("resource_id");

-- CreateIndex
CREATE INDEX "resource_shares_user_id_idx" ON "resource_shares"("user_id");

-- CreateIndex
CREATE INDEX "resource_shares_share_token_idx" ON "resource_shares"("share_token");

-- CreateIndex
CREATE INDEX "resource_permissions_resource_id_idx" ON "resource_permissions"("resource_id");

-- CreateIndex
CREATE INDEX "resource_permissions_user_id_idx" ON "resource_permissions"("user_id");

-- CreateIndex
CREATE INDEX "resource_versions_resource_id_idx" ON "resource_versions"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_versions_resource_id_version_key" ON "resource_versions"("resource_id", "version");

-- CreateIndex
CREATE INDEX "agent_collaborators_user_id_idx" ON "agent_collaborators"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_collaborators_agent_id_user_id_key" ON "agent_collaborators"("agent_id", "user_id");

-- CreateIndex
CREATE INDEX "agent_execution_steps_execution_id_idx" ON "agent_execution_steps"("execution_id");

-- CreateIndex
CREATE INDEX "agent_execution_steps_step_number_idx" ON "agent_execution_steps"("step_number");

-- CreateIndex
CREATE INDEX "agent_executions_agent_id_idx" ON "agent_executions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_executions_started_at_idx" ON "agent_executions"("started_at");

-- CreateIndex
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");

-- CreateIndex
CREATE INDEX "agent_executions_triggered_by_idx" ON "agent_executions"("triggered_by");

-- CreateIndex
CREATE INDEX "agent_feedback_agent_id_idx" ON "agent_feedback"("agent_id");

-- CreateIndex
CREATE INDEX "agent_feedback_feedback_type_idx" ON "agent_feedback"("feedback_type");

-- CreateIndex
CREATE INDEX "agent_feedback_user_id_idx" ON "agent_feedback"("user_id");

-- CreateIndex
CREATE INDEX "agent_memories_agent_id_idx" ON "agent_memories"("agent_id");

-- CreateIndex
CREATE INDEX "agent_memories_expires_at_idx" ON "agent_memories"("expires_at");

-- CreateIndex
CREATE INDEX "agent_memories_importance_idx" ON "agent_memories"("importance");

-- CreateIndex
CREATE INDEX "agent_memories_memory_type_idx" ON "agent_memories"("memory_type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memories_agent_id_key_key" ON "agent_memories"("agent_id", "key");

-- CreateIndex
CREATE INDEX "agent_schedules_agent_id_idx" ON "agent_schedules"("agent_id");

-- CreateIndex
CREATE INDEX "agent_schedules_is_active_idx" ON "agent_schedules"("is_active");

-- CreateIndex
CREATE INDEX "agent_schedules_next_run_at_idx" ON "agent_schedules"("next_run_at");

-- CreateIndex
CREATE INDEX "agent_schedules_priority_idx" ON "agent_schedules"("priority");

-- CreateIndex
CREATE INDEX "agent_triggers_agent_id_idx" ON "agent_triggers"("agent_id");

-- CreateIndex
CREATE INDEX "agent_triggers_trigger_type_idx" ON "agent_triggers"("trigger_type");

-- CreateIndex
CREATE INDEX "agent_triggers_is_active_idx" ON "agent_triggers"("is_active");

-- CreateIndex
CREATE INDEX "agent_triggers_priority_idx" ON "agent_triggers"("priority");

-- CreateIndex
CREATE INDEX "agent_triggers_last_triggered_at_idx" ON "agent_triggers"("last_triggered_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_tasks_execution_id_key" ON "agent_tasks"("execution_id");

-- CreateIndex
CREATE INDEX "agent_tasks_agent_id_idx" ON "agent_tasks"("agent_id");

-- CreateIndex
CREATE INDEX "agent_tasks_created_at_idx" ON "agent_tasks"("created_at");

-- CreateIndex
CREATE INDEX "agent_tasks_priority_idx" ON "agent_tasks"("priority");

-- CreateIndex
CREATE INDEX "agent_tasks_scheduled_for_idx" ON "agent_tasks"("scheduled_for");

-- CreateIndex
CREATE INDEX "agent_tasks_status_idx" ON "agent_tasks"("status");

-- CreateIndex
CREATE INDEX "agent_tool_calls_execution_id_idx" ON "agent_tool_calls"("execution_id");

-- CreateIndex
CREATE INDEX "agent_tool_calls_started_at_idx" ON "agent_tool_calls"("started_at");

-- CreateIndex
CREATE INDEX "agent_tool_calls_status_idx" ON "agent_tool_calls"("status");

-- CreateIndex
CREATE INDEX "agent_tool_calls_tool_id_idx" ON "agent_tool_calls"("tool_id");

-- CreateIndex
CREATE INDEX "agent_tools_agent_id_idx" ON "agent_tools"("agent_id");

-- CreateIndex
CREATE INDEX "agent_tools_is_active_idx" ON "agent_tools"("is_active");

-- CreateIndex
CREATE INDEX "agent_tools_tool_type_idx" ON "agent_tools"("tool_type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_tools_agent_id_name_key" ON "agent_tools"("agent_id", "name");

-- CreateIndex
CREATE INDEX "agent_versions_agent_id_idx" ON "agent_versions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_versions_version_number_idx" ON "agent_versions"("version_number");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agent_id_version_key" ON "agent_versions"("agent_id", "version");

-- CreateIndex
CREATE INDEX "agent_audit_logs_agent_id_idx" ON "agent_audit_logs"("agent_id");

-- CreateIndex
CREATE INDEX "agent_audit_logs_user_id_idx" ON "agent_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "agent_audit_logs_action_idx" ON "agent_audit_logs"("action");

-- CreateIndex
CREATE INDEX "agent_audit_logs_created_at_idx" ON "agent_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "ai_agents_agent_type_idx" ON "ai_agents"("agent_type");

-- CreateIndex
CREATE INDEX "ai_agents_created_at_idx" ON "ai_agents"("created_at");

-- CreateIndex
CREATE INDEX "ai_agents_created_by_idx" ON "ai_agents"("created_by");

-- CreateIndex
CREATE INDEX "ai_agents_is_active_idx" ON "ai_agents"("is_active");

-- CreateIndex
CREATE INDEX "ai_agents_status_idx" ON "ai_agents"("status");

-- CreateIndex
CREATE INDEX "ai_agents_workspace_id_idx" ON "ai_agents"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_agents_organization_id_idx" ON "ai_agents"("organization_id");

-- CreateIndex
CREATE INDEX "ai_agents_department_id_idx" ON "ai_agents"("department_id");

-- CreateIndex
CREATE INDEX "ai_agents_space_id_idx" ON "ai_agents"("space_id");

-- CreateIndex
CREATE INDEX "ai_agents_project_id_idx" ON "ai_agents"("project_id");

-- CreateIndex
CREATE INDEX "ai_agents_team_id_idx" ON "ai_agents"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_tools_name_key" ON "system_tools"("name");

-- CreateIndex
CREATE INDEX "system_tools_category_idx" ON "system_tools"("category");

-- CreateIndex
CREATE INDEX "system_tools_is_active_idx" ON "system_tools"("is_active");

-- CreateIndex
CREATE INDEX "system_tools_is_built_in_idx" ON "system_tools"("is_built_in");

-- CreateIndex
CREATE INDEX "agent_relations_parent_id_idx" ON "agent_relations"("parent_id");

-- CreateIndex
CREATE INDEX "agent_relations_child_id_idx" ON "agent_relations"("child_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_relations_parent_id_child_id_key" ON "agent_relations"("parent_id", "child_id");

-- CreateIndex
CREATE INDEX "agent_templates_workspace_id_idx" ON "agent_templates"("workspace_id");

-- CreateIndex
CREATE INDEX "agent_templates_is_system_idx" ON "agent_templates"("is_system");

-- CreateIndex
CREATE INDEX "agent_templates_usage_count_idx" ON "agent_templates"("usage_count");

-- CreateIndex
CREATE INDEX "workspace_guests_workspace_id_idx" ON "workspace_guests"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_guests_user_id_idx" ON "workspace_guests"("user_id");

-- CreateIndex
CREATE INDEX "workspace_guests_guest_type_idx" ON "workspace_guests"("guest_type");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_guests_workspace_id_user_id_key" ON "workspace_guests"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "location_permissions_location_type_location_id_idx" ON "location_permissions"("location_type", "location_id");

-- CreateIndex
CREATE INDEX "location_permissions_user_id_idx" ON "location_permissions"("user_id");

-- CreateIndex
CREATE INDEX "location_permissions_team_id_idx" ON "location_permissions"("team_id");

-- CreateIndex
CREATE INDEX "location_permissions_permission_idx" ON "location_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "location_permissions_location_type_location_id_user_id_key" ON "location_permissions"("location_type", "location_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_permissions_location_type_location_id_team_id_key" ON "location_permissions"("location_type", "location_id", "team_id");

-- CreateIndex
CREATE INDEX "task_permissions_task_id_idx" ON "task_permissions"("task_id");

-- CreateIndex
CREATE INDEX "task_permissions_user_id_idx" ON "task_permissions"("user_id");

-- CreateIndex
CREATE INDEX "task_permissions_team_id_idx" ON "task_permissions"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_permissions_task_id_user_id_key" ON "task_permissions"("task_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_permissions_task_id_team_id_key" ON "task_permissions"("task_id", "team_id");

-- CreateIndex
CREATE INDEX "custom_roles_workspace_id_idx" ON "custom_roles"("workspace_id");

-- CreateIndex
CREATE INDEX "custom_roles_base_role_idx" ON "custom_roles"("base_role");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_workspace_id_name_key" ON "custom_roles"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_invitations_token_key" ON "permission_invitations"("token");

-- CreateIndex
CREATE INDEX "permission_invitations_workspace_id_idx" ON "permission_invitations"("workspace_id");

-- CreateIndex
CREATE INDEX "permission_invitations_invited_by_id_idx" ON "permission_invitations"("invited_by_id");

-- CreateIndex
CREATE INDEX "permission_invitations_invited_user_id_idx" ON "permission_invitations"("invited_user_id");

-- CreateIndex
CREATE INDEX "permission_invitations_email_idx" ON "permission_invitations"("email");

-- CreateIndex
CREATE INDEX "permission_invitations_status_idx" ON "permission_invitations"("status");

-- CreateIndex
CREATE INDEX "permission_invitations_token_idx" ON "permission_invitations"("token");

-- CreateIndex
CREATE INDEX "permission_invitations_expires_at_idx" ON "permission_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "public_links_token_key" ON "public_links"("token");

-- CreateIndex
CREATE INDEX "public_links_workspace_id_idx" ON "public_links"("workspace_id");

-- CreateIndex
CREATE INDEX "public_links_token_idx" ON "public_links"("token");

-- CreateIndex
CREATE INDEX "public_links_is_active_idx" ON "public_links"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "public_links_location_type_location_id_key" ON "public_links"("location_type", "location_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_type_id_fkey" FOREIGN KEY ("task_type_id") REFERENCES "task_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "task_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_types" ADD CONSTRAINT "task_types_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_watchers" ADD CONSTRAINT "task_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "task_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_custom_field_id_fkey" FOREIGN KEY ("custom_field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "views" ADD CONSTRAINT "views_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_shares" ADD CONSTRAINT "view_shares_view_id_fkey" FOREIGN KEY ("view_id") REFERENCES "views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_shares" ADD CONSTRAINT "view_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_shares" ADD CONSTRAINT "view_shares_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_updates" ADD CONSTRAINT "goal_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "channel_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_messages" ADD CONSTRAINT "channel_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_activities" ADD CONSTRAINT "workspace_activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_analytics" ADD CONSTRAINT "workspace_analytics_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_triggers" ADD CONSTRAINT "automation_triggers_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_likes" ADD CONSTRAINT "user_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comments" ADD CONSTRAINT "user_comments_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comments" ADD CONSTRAINT "user_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "founder_profiles" ADD CONSTRAINT "founder_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "marketplace_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cap_table_entries" ADD CONSTRAINT "cap_table_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_updates" ADD CONSTRAINT "investor_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ownership_transfers" ADD CONSTRAINT "project_ownership_transfers_from_owner_id_fkey" FOREIGN KEY ("from_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ownership_transfers" ADD CONSTRAINT "project_ownership_transfers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_ownership_transfers" ADD CONSTRAINT "project_ownership_transfers_to_owner_id_fkey" FOREIGN KEY ("to_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_blocked_members" ADD CONSTRAINT "project_blocked_members_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_blocked_members" ADD CONSTRAINT "project_blocked_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_blocked_members" ADD CONSTRAINT "project_blocked_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_likes" ADD CONSTRAINT "team_likes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_likes" ADD CONSTRAINT "team_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_comments" ADD CONSTRAINT "team_comments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_comments" ADD CONSTRAINT "team_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_giver_id_fkey" FOREIGN KEY ("giver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_endorsements" ADD CONSTRAINT "skill_endorsements_endorser_id_fkey" FOREIGN KEY ("endorser_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_endorsements" ADD CONSTRAINT "skill_endorsements_user_skill_id_fkey" FOREIGN KEY ("user_skill_id") REFERENCES "user_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_delivery" ADD CONSTRAINT "message_delivery_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_comments" ADD CONSTRAINT "project_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_likes" ADD CONSTRAINT "proposal_likes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_likes" ADD CONSTRAINT "proposal_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_analytics" ADD CONSTRAINT "project_analytics_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_purchases" ADD CONSTRAINT "material_purchases_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_purchases" ADD CONSTRAINT "material_purchases_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_proposals" ADD CONSTRAINT "membership_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investor_proposals" ADD CONSTRAINT "investor_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_proposals" ADD CONSTRAINT "mentor_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_proposals" ADD CONSTRAINT "team_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofounder_proposals" ADD CONSTRAINT "cofounder_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_proposals" ADD CONSTRAINT "partner_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_proposals" ADD CONSTRAINT "customer_proposals_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "credit_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_purchases" ADD CONSTRAINT "credit_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "credit_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "credit_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_creditPurchaseId_fkey" FOREIGN KEY ("creditPurchaseId") REFERENCES "credit_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_plan" ADD CONSTRAINT "discount_to_plan_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_plan" ADD CONSTRAINT "discount_to_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_package" ADD CONSTRAINT "discount_to_package_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_package" ADD CONSTRAINT "discount_to_package_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "credit_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_user" ADD CONSTRAINT "discount_to_user_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_to_user" ADD CONSTRAINT "discount_to_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_user" ADD CONSTRAINT "promotion_to_user_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_user" ADD CONSTRAINT "promotion_to_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_plan" ADD CONSTRAINT "promotion_to_plan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_plan" ADD CONSTRAINT "promotion_to_plan_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_package" ADD CONSTRAINT "promotion_to_package_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "credit_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_to_package" ADD CONSTRAINT "promotion_to_package_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_credit_purchase_id_fkey" FOREIGN KEY ("credit_purchase_id") REFERENCES "credit_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_quotas" ADD CONSTRAINT "user_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vector_embeddings" ADD CONSTRAINT "vector_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_feedback" ADD CONSTRAINT "ai_message_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_feedback" ADD CONSTRAINT "ai_message_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_feedback" ADD CONSTRAINT "ai_conversation_feedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_feedback" ADD CONSTRAINT "ai_conversation_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_shares" ADD CONSTRAINT "ai_conversation_shares_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_shares" ADD CONSTRAINT "ai_conversation_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation_shares" ADD CONSTRAINT "ai_conversation_shares_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_annotations" ADD CONSTRAINT "ai_message_annotations_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "ai_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message_annotations" ADD CONSTRAINT "ai_message_annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "resource_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_comments" ADD CONSTRAINT "resource_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_ratings" ADD CONSTRAINT "resource_ratings_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_ratings" ADD CONSTRAINT "resource_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookmarks" ADD CONSTRAINT "resource_bookmarks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_bookmarks" ADD CONSTRAINT "resource_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_shares" ADD CONSTRAINT "resource_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_permissions" ADD CONSTRAINT "resource_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_collaborators" ADD CONSTRAINT "agent_collaborators_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_collaborators" ADD CONSTRAINT "agent_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_steps" ADD CONSTRAINT "agent_execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedback" ADD CONSTRAINT "agent_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_triggers" ADD CONSTRAINT "agent_triggers_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_calls" ADD CONSTRAINT "agent_tool_calls_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "agent_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_audit_logs" ADD CONSTRAINT "agent_audit_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_audit_logs" ADD CONSTRAINT "agent_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relations" ADD CONSTRAINT "agent_relations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_relations" ADD CONSTRAINT "agent_relations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_templates" ADD CONSTRAINT "agent_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_guests" ADD CONSTRAINT "workspace_guests_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_guests" ADD CONSTRAINT "workspace_guests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_guests" ADD CONSTRAINT "workspace_guests_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_permissions" ADD CONSTRAINT "location_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_permissions" ADD CONSTRAINT "location_permissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_permissions" ADD CONSTRAINT "location_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_permissions" ADD CONSTRAINT "task_permissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_permissions" ADD CONSTRAINT "task_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_permissions" ADD CONSTRAINT "task_permissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_permissions" ADD CONSTRAINT "task_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_invitations" ADD CONSTRAINT "permission_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_invitations" ADD CONSTRAINT "permission_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_invitations" ADD CONSTRAINT "permission_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_invitations" ADD CONSTRAINT "permission_invitations_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_links" ADD CONSTRAINT "public_links_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public_links" ADD CONSTRAINT "public_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
