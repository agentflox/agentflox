import { WorkforceEdge, WorkforceEdgeData, WorkforceNode } from "./store/useWorkforceStore";

export type WorkforceTemplateId =
  | "lead-research-enrichment"
  | "inbound-support-triage"
  | "content-repurposing-engine"
  | "sales-follow-up-sequence"
  | "competitor-monitoring-briefing"
  | "job-application-screener"
  | "bug-report-processor"
  | "customer-churn-risk-detector"
  | "social-monitoring-response"
  | "weekly-business-digest";

export interface WorkforceTemplate {
  id: WorkforceTemplateId;
  name: string;
  description: string;
  category: string;
  targetTeams: string;
  mode: "FLOW";
  nodes: WorkforceNode[];
  edges: WorkforceEdge[];
}

const edgeData = (overrides: Partial<WorkforceEdgeData> = {}): WorkforceEdgeData => ({
  taskBehavior: "CONTINUE_SAME_TASK",
  connectionType: "FLOW",
  approvalMode: "AUTO_RUN",
  maxAutoRuns: null,
  ...overrides,
});

const id = (suffix: string) => suffix;

export const WORKFORCE_TEMPLATES: WorkforceTemplate[] = [
  {
    id: "lead-research-enrichment",
    name: "Lead Research & Enrichment Pipeline",
    description:
      "Research B2B leads, score against your ICP, personalize copy, update your sheet, and alert reps automatically.",
    category: "Sales",
    targetTeams: "Sales, RevOps",
    mode: "FLOW",
    nodes: [
      {
        id: id("t1-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "New row in Google Sheets",
          source: "GOOGLE_SHEETS",
          triggerType: "ROW_ADDED",
        },
      },
      {
        id: id("t1-researcher"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Lead Researcher",
          description:
            "Research company & person: funding, size, tech stack, recent news, LinkedIn bio.",
          role: "RESEARCHER",
        },
      },
      {
        id: id("t1-scorer"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "ICP Scorer",
          description:
            "Score lead 1–10 against ICP (B2B SaaS, 50–500 employees, Series A–C, uses Salesforce).",
          role: "SCORER",
        },
      },
      {
        id: id("t1-condition-score"),
        type: "conditionNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Score ≥ 7?",
          conditionMode: "rule",
          conditionGroups: [
            {
              id: "group-1",
              label: "IF",
              matchMode: "all",
              targetHandle: "true",
              rules: [
                {
                  id: "rule-1",
                  leftVariable: "lead.score",
                  leftLabel: "Lead score",
                  operator: "greater_than",
                  rightValue: "7",
                  rightLabel: "7",
                },
              ],
            },
          ],
        },
      },
      {
        id: id("t1-personalizer"),
        type: "agentNode",
        position: { x: 1040, y: -80 },
        data: {
          label: "Personalizer",
          description: "Write personalized first line for cold outreach using research & score.",
          role: "WRITER",
        },
      },
      {
        id: id("t1-sheets-low"),
        type: "toolNode",
        position: { x: 1040, y: 80 },
        data: {
          label: "Update Sheet: low priority",
          provider: "GOOGLE_SHEETS",
          action: "UPDATE_ROW",
        },
      },
      {
        id: id("t1-sheets-update"),
        type: "toolNode",
        position: { x: 1300, y: -80 },
        data: {
          label: "Update Sheet: ready",
          provider: "GOOGLE_SHEETS",
          action: "UPDATE_ROW",
        },
      },
      {
        id: id("t1-slack-notify"),
        type: "toolNode",
        position: { x: 1560, y: -80 },
        data: {
          label: "Slack: new hot lead",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t1-e1"),
        source: id("t1-trigger"),
        target: id("t1-researcher"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t1-e2"),
        source: id("t1-researcher"),
        target: id("t1-scorer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t1-e3"),
        source: id("t1-scorer"),
        target: id("t1-condition-score"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t1-e4-yes"),
        source: id("t1-condition-score"),
        target: id("t1-personalizer"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Score ≥ 7" }),
      },
      {
        id: id("t1-e5-no"),
        source: id("t1-condition-score"),
        target: id("t1-sheets-low"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Score < 7" }),
      },
      {
        id: id("t1-e6"),
        source: id("t1-personalizer"),
        target: id("t1-sheets-update"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t1-e7"),
        source: id("t1-sheets-update"),
        target: id("t1-slack-notify"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "inbound-support-triage",
    name: "Inbound Support Triage",
    description:
      "Classify, prioritize, respond, log, and escalate inbound support emails with multi-step reasoning.",
    category: "Support",
    targetTeams: "Support, Operations",
    mode: "FLOW",
    nodes: [
      {
        id: id("t2-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "New email in Gmail (support@)",
          source: "GMAIL",
          triggerType: "NEW_MESSAGE",
        },
      },
      {
        id: id("t2-classifier"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Ticket Classifier",
          description:
            "Classify category, urgency, sentiment, and churn risk for each incoming email.",
          role: "CLASSIFIER",
        },
      },
      {
        id: id("t2-condition-urgent"),
        type: "conditionNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Urgent or churn risk?",
          conditionMode: "rule",
          conditionGroups: [
            {
              id: "group-1",
              label: "IF",
              matchMode: "any",
              targetHandle: "true",
              rules: [
                {
                  id: "rule-1",
                  leftVariable: "ticket.urgency",
                  leftLabel: "Urgency",
                  operator: "equals",
                  rightValue: "critical",
                  rightLabel: "critical",
                },
                {
                  id: "rule-2",
                  leftVariable: "ticket.churnRisk",
                  leftLabel: "Churn risk",
                  operator: "equals",
                  rightValue: "true",
                  rightLabel: "true",
                },
              ],
            },
          ],
        },
      },
      {
        id: id("t2-responder-fast"),
        type: "agentNode",
        position: { x: 780, y: -80 },
        data: {
          label: "Responder – Fast",
          description:
            "Draft urgent, empathetic response and escalate critical issues to humans immediately.",
          role: "RESPONDER_FAST",
        },
      },
      {
        id: id("t2-responder-standard"),
        type: "agentNode",
        position: { x: 780, y: 80 },
        data: {
          label: "Responder – Standard",
          description: "Draft helpful response using knowledge base articles.",
          role: "RESPONDER_STANDARD",
        },
      },
      {
        id: id("t2-notion-log"),
        type: "toolNode",
        position: { x: 1040, y: 0 },
        data: {
          label: "Log ticket in Notion",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
      {
        id: id("t2-gmail-send-fast"),
        type: "toolNode",
        position: { x: 1040, y: -160 },
        data: {
          label: "Send urgent reply (Gmail)",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
      {
        id: id("t2-gmail-send-standard"),
        type: "toolNode",
        position: { x: 1040, y: 160 },
        data: {
          label: "Send standard reply (Gmail)",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
      {
        id: id("t2-slack-alert"),
        type: "toolNode",
        position: { x: 1300, y: -160 },
        data: {
          label: "Slack: #support-urgent",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t2-e1"),
        source: id("t2-trigger"),
        target: id("t2-classifier"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e2"),
        source: id("t2-classifier"),
        target: id("t2-condition-urgent"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e3-yes"),
        source: id("t2-condition-urgent"),
        target: id("t2-responder-fast"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Urgent / churn risk" }),
      },
      {
        id: id("t2-e4-no"),
        source: id("t2-condition-urgent"),
        target: id("t2-responder-standard"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Normal" }),
      },
      {
        id: id("t2-e5"),
        source: id("t2-responder-fast"),
        target: id("t2-gmail-send-fast"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e6"),
        source: id("t2-responder-standard"),
        target: id("t2-gmail-send-standard"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e7"),
        source: id("t2-responder-fast"),
        target: id("t2-notion-log"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e8"),
        source: id("t2-responder-standard"),
        target: id("t2-notion-log"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t2-e9"),
        source: id("t2-gmail-send-fast"),
        target: id("t2-slack-alert"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "content-repurposing-engine",
    name: "Content Repurposing Engine",
    description:
      "Turn one blog post into a Twitter thread, LinkedIn post, and newsletter snippet automatically.",
    category: "Marketing",
    targetTeams: "Marketing, Content",
    mode: "FLOW",
    nodes: [
      {
        id: id("t3-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "New Airtable row (blog URL)",
          source: "AIRTABLE",
          triggerType: "RECORD_CREATED",
        },
      },
      {
        id: id("t3-extractor"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Content Extractor",
          description: "Fetch blog via HTTP and extract key points, quotes, stats, tone.",
          role: "EXTRACTOR",
        },
      },
      {
        id: id("t3-twitter"),
        type: "agentNode",
        position: { x: 520, y: -120 },
        data: {
          label: "Twitter Thread Writer",
          description: "Write 5-tweet hook-first thread from extracted content.",
          role: "WRITER_TWITTER",
        },
      },
      {
        id: id("t3-linkedin"),
        type: "agentNode",
        position: { x: 520, y: 40 },
        data: {
          label: "LinkedIn Post Writer",
          description: "Write 200-word professional LinkedIn post with 3 key takeaways.",
          role: "WRITER_LINKEDIN",
        },
      },
      {
        id: id("t3-newsletter"),
        type: "agentNode",
        position: { x: 520, y: 200 },
        data: {
          label: "Newsletter Snippet Writer",
          description: "Write 100-word newsletter blurb linking to the article.",
          role: "WRITER_NEWSLETTER",
        },
      },
      {
        id: id("t3-airtable-update"),
        type: "toolNode",
        position: { x: 800, y: 40 },
        data: {
          label: "Update Airtable record",
          provider: "AIRTABLE",
          action: "UPDATE_RECORD",
        },
      },
      {
        id: id("t3-slack"),
        type: "toolNode",
        position: { x: 1060, y: 40 },
        data: {
          label: "Slack: #marketing",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t3-e1"),
        source: id("t3-trigger"),
        target: id("t3-extractor"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t3-e2a"),
        source: id("t3-extractor"),
        target: id("t3-twitter"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Twitter thread" }),
      },
      {
        id: id("t3-e2b"),
        source: id("t3-extractor"),
        target: id("t3-linkedin"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "LinkedIn" }),
      },
      {
        id: id("t3-e2c"),
        source: id("t3-extractor"),
        target: id("t3-newsletter"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Newsletter" }),
      },
      {
        id: id("t3-e3a"),
        source: id("t3-twitter"),
        target: id("t3-airtable-update"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t3-e3b"),
        source: id("t3-linkedin"),
        target: id("t3-airtable-update"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t3-e3c"),
        source: id("t3-newsletter"),
        target: id("t3-airtable-update"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t3-e4"),
        source: id("t3-airtable-update"),
        target: id("t3-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "sales-follow-up-sequence",
    name: "Sales Follow-Up Sequence",
    description:
      "Memory-aware follow-up emails triggered from your CRM when deals move to proposal sent.",
    category: "Sales",
    targetTeams: "Sales",
    mode: "FLOW",
    nodes: [
      {
        id: id("t4-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "CRM webhook: Proposal Sent",
          source: "WEBHOOK",
          triggerType: "DEAL_STAGE_CHANGED",
        },
      },
      {
        id: id("t4-context"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Deal Context Builder",
          description:
            "Pull emails, objections, decision-maker info, and company news from memory + inbox.",
          role: "CONTEXT_BUILDER",
        },
      },
      {
        id: id("t4-writer"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Follow-up Email Writer",
          description:
            "Write tailored follow-up referencing their situation, objections, and style.",
          role: "EMAIL_WRITER",
        },
      },
      {
        id: id("t4-condition-delay"),
        type: "conditionNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Days since proposal ≥ 3?",
          conditionMode: "rule",
          conditionGroups: [
            {
              id: "group-1",
              label: "IF",
              matchMode: "all",
              targetHandle: "true",
              rules: [
                {
                  id: "rule-1",
                  leftVariable: "deal.daysSinceProposal",
                  leftLabel: "Days since proposal",
                  operator: "greater_than",
                  rightValue: "3",
                  rightLabel: "3",
                },
              ],
            },
          ],
        },
      },
      {
        id: id("t4-gmail-send"),
        type: "toolNode",
        position: { x: 1040, y: -80 },
        data: {
          label: "Send follow-up (Gmail)",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
      {
        id: id("t4-airtable-log"),
        type: "toolNode",
        position: { x: 1040, y: 80 },
        data: {
          label: "Log: wait until day 3",
          provider: "AIRTABLE",
          action: "UPDATE_RECORD",
        },
      },
      {
        id: id("t4-memory"),
        type: "toolNode",
        position: { x: 1300, y: -80 },
        data: {
          label: "Store follow-up in memory",
          provider: "MEMORY",
          action: "STORE_EVENT",
        },
      },
      {
        id: id("t4-slack"),
        type: "toolNode",
        position: { x: 1560, y: -80 },
        data: {
          label: "Slack: notify owner",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t4-e1"),
        source: id("t4-trigger"),
        target: id("t4-context"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t4-e2"),
        source: id("t4-context"),
        target: id("t4-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t4-e3"),
        source: id("t4-writer"),
        target: id("t4-condition-delay"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t4-e4-yes"),
        source: id("t4-condition-delay"),
        target: id("t4-gmail-send"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "≥ 3 days" }),
      },
      {
        id: id("t4-e5-no"),
        source: id("t4-condition-delay"),
        target: id("t4-airtable_log"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "< 3 days" }),
      },
      {
        id: id("t4-e6"),
        source: id("t4-gmail-send"),
        target: id("t4-memory"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t4-e7"),
        source: id("t4-memory"),
        target: id("t4-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  // NOTE: Remaining templates are structurally similar; for brevity we keep graphs modest
  {
    id: "competitor-monitoring-briefing",
    name: "Competitor Monitoring & Briefing",
    description:
      "Run a weekly competitor scan, analyze signals, and deliver a 1-page competitive brief automatically.",
    category: "Marketing",
    targetTeams: "Marketing, Sales",
    mode: "FLOW",
    nodes: [
      {
        id: id("t5-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Every Monday 8am",
          source: "SCHEDULE",
          triggerType: "CRON",
        },
      },
      {
        id: id("t5-monitor"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "News Monitor",
          description: "Fetch news, reviews, and social chatter for key competitors.",
          role: "MONITOR",
        },
      },
      {
        id: id("t5-analyst"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Competitive Analyst",
          description:
            "Summarize new features, pricing changes, customer complaints, and threat level.",
          role: "ANALYST",
        },
      },
      {
        id: id("t5-writer"),
        type: "agentNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Brief Writer",
          description: "Write 1-page competitive brief with talking points for sales.",
          role: "WRITER",
        },
      },
      {
        id: id("t5-notion"),
        type: "toolNode",
        position: { x: 1040, y: 0 },
        data: {
          label: "Save to Notion DB",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
      {
        id: id("t5-slack"),
        type: "toolNode",
        position: { x: 1300, y: 0 },
        data: {
          label: "Slack: #competitive",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t5-e1"),
        source: id("t5-trigger"),
        target: id("t5-monitor"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t5-e2"),
        source: id("t5-monitor"),
        target: id("t5-analyst"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t5-e3"),
        source: id("t5-analyst"),
        target: id("t5-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t5-e4"),
        source: id("t5-writer"),
        target: id("t5-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t5-e5"),
        source: id("t5-notion"),
        target: id("t5-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "job-application-screener",
    name: "Job Application Screener",
    description:
      "Parse resumes, score candidates against role requirements, and personalize accept/reject emails.",
    category: "People",
    targetTeams: "HR, Talent",
    mode: "FLOW",
    nodes: [
      {
        id: id("t6-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "New application email",
          source: "GMAIL",
          triggerType: "NEW_MESSAGE",
        },
      },
      {
        id: id("t6-parser"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Resume Parser",
          description: "Extract candidate profile, skills, history, and location.",
          role: "PARSER",
        },
      },
      {
        id: id("t6-scorer"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Fit Scorer",
          description: "Score candidate 0–100 vs. job requirements from memory.",
          role: "SCORER",
        },
      },
      {
        id: id("t6-condition"),
        type: "conditionNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Total score ≥ 70?",
          conditionMode: "rule",
          conditionGroups: [
            {
              id: "group-1",
              label: "IF",
              matchMode: "all",
              targetHandle: "true",
              rules: [
                {
                  id: "rule-1",
                  leftVariable: "candidate.score",
                  leftLabel: "Candidate score",
                  operator: "greater_than",
                  rightValue: "70",
                  rightLabel: "70",
                },
              ],
            },
          ],
        },
      },
      {
        id: id("t6-invite-writer"),
        type: "agentNode",
        position: { x: 1040, y: -80 },
        data: {
          label: "Interview Invite Writer",
          description: "Write warm invite referencing their background.",
          role: "WRITER_INVITE",
        },
      },
      {
        id: id("t6-reject-writer"),
        type: "agentNode",
        position: { x: 1040, y: 80 },
        data: {
          label: "Rejection Writer",
          description: "Write kind, specific rejection email.",
          role: "WRITER_REJECT",
        },
      },
      {
        id: id("t6-gmail-invite"),
        type: "toolNode",
        position: { x: 1300, y: -80 },
        data: {
          label: "Send invite (Gmail)",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
      {
        id: id("t6-gmail-reject"),
        type: "toolNode",
        position: { x: 1300, y: 80 },
        data: {
          label: "Send rejection (Gmail)",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
    ],
    edges: [
      {
        id: id("t6-e1"),
        source: id("t6-trigger"),
        target: id("t6-parser"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t6-e2"),
        source: id("t6-parser"),
        target: id("t6-scorer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t6-e3"),
        source: id("t6-scorer"),
        target: id("t6-condition"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t6-e4-yes"),
        source: id("t6-condition"),
        target: id("t6-invite-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Good fit" }),
      },
      {
        id: id("t6-e5-no"),
        source: id("t6-condition"),
        target: id("t6-reject-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Not a fit" }),
      },
      {
        id: id("t6-e6"),
        source: id("t6-invite-writer"),
        target: id("t6-gmail-invite"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t6-e7"),
        source: id("t6-reject-writer"),
        target: id("t6-gmail-reject"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "bug-report-processor",
    name: "Bug Report Processor",
    description:
      "Analyze new errors, classify severity, open GitHub issues or incidents, and log to Notion.",
    category: "Engineering",
    targetTeams: "Engineering, SRE",
    mode: "FLOW",
    nodes: [
      {
        id: id("t7-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Error monitoring webhook",
          source: "WEBHOOK",
          triggerType: "ERROR_EVENT",
        },
      },
      {
        id: id("t7-analyzer"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Error Analyzer",
          description:
            "Determine severity, affected users, likely root cause, and related deploys.",
          role: "ANALYZER",
        },
      },
      {
        id: id("t7-condition"),
        type: "conditionNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Severity P1 / P2?",
          conditionMode: "rule",
        },
      },
      {
        id: id("t7-incident-writer"),
        type: "agentNode",
        position: { x: 780, y: -80 },
        data: {
          label: "Incident Writer",
          description: "Draft incident report with mitigation steps.",
          role: "WRITER_INCIDENT",
        },
      },
      {
        id: id("t7-ticket-writer"),
        type: "agentNode",
        position: { x: 780, y: 80 },
        data: {
          label: "Ticket Writer",
          description: "Draft GitHub issue with repro steps and fix suggestion.",
          role: "WRITER_TICKET",
        },
      },
      {
        id: id("t7-slack-incidents"),
        type: "toolNode",
        position: { x: 1040, y: -80 },
        data: {
          label: "Slack: #incidents",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
      {
        id: id("t7-github"),
        type: "toolNode",
        position: { x: 1040, y: 80 },
        data: {
          label: "Create GitHub issue",
          provider: "GITHUB",
          action: "CREATE_ISSUE",
        },
      },
      {
        id: id("t7-notion"),
        type: "toolNode",
        position: { x: 1300, y: 0 },
        data: {
          label: "Log bug in Notion",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t7-e1"),
        source: id("t7-trigger"),
        target: id("t7-analyzer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t7-e2"),
        source: id("t7-analyzer"),
        target: id("t7-condition"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t7-e3-yes"),
        source: id("t7-condition"),
        target: id("t7-incident-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "P1 / P2" }),
      },
      {
        id: id("t7-e4-no"),
        source: id("t7-condition"),
        target: id("t7-ticket-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "P3 / P4" }),
      },
      {
        id: id("t7-e5"),
        source: id("t7-incident-writer"),
        target: id("t7-slack-incidents"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t7-e6"),
        source: id("t7-ticket-writer"),
        target: id("t7-github"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t7-e7a"),
        source: id("t7-slack-incidents"),
        target: id("t7-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t7-e7b"),
        source: id("t7-github"),
        target: id("t7-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "customer-churn-risk-detector",
    name: "Customer Churn Risk Detector",
    description:
      "Aggregate product signals, score churn risk, and generate targeted intervention plans daily.",
    category: "Success",
    targetTeams: "Customer Success, RevOps",
    mode: "FLOW",
    nodes: [
      {
        id: id("t8-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Daily at 9am",
          source: "SCHEDULE",
          triggerType: "CRON",
        },
      },
      {
        id: id("t8-collector"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Signal Collector",
          description:
            "Pull logins, tickets, email replies, and feature usage metrics for all customers.",
          role: "COLLECTOR",
        },
      },
      {
        id: id("t8-scorer"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Churn Scorer",
          description:
            "Score churn risk for each account (low / medium / high / critical) using trends + sentiment.",
          role: "SCORER",
        },
      },
      {
        id: id("t8-intervention"),
        type: "agentNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Intervention Planner",
          description:
            "Generate specific outreach plans for high/critical accounts: who, what, and how.",
          role: "PLANNER",
        },
      },
      {
        id: id("t8-notion"),
        type: "toolNode",
        position: { x: 1040, y: 0 },
        data: {
          label: "Save report to Notion",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
      {
        id: id("t8-slack"),
        type: "toolNode",
        position: { x: 1300, y: 0 },
        data: {
          label: "Slack: #customer-success",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t8-e1"),
        source: id("t8-trigger"),
        target: id("t8-collector"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t8-e2"),
        source: id("t8-collector"),
        target: id("t8-scorer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t8-e3"),
        source: id("t8-scorer"),
        target: id("t8-intervention"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t8-e4"),
        source: id("t8-intervention"),
        target: id("t8-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t8-e5"),
        source: id("t8-notion"),
        target: id("t8-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
  {
    id: "social-monitoring-response",
    name: "Social Media Monitoring & Response",
    description:
      "Monitor Twitter, Reddit, and news for mentions, classify sentiment, and draft on-brand responses.",
    category: "Marketing",
    targetTeams: "Marketing, Comms",
    mode: "FLOW",
    nodes: [
      {
        id: id("t9-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Every 4 hours",
          source: "SCHEDULE",
          triggerType: "CRON",
        },
      },
      {
        id: id("t9-monitor"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Social Monitor",
          description: "Search Twitter, Reddit, and news for brand mentions.",
          role: "MONITOR",
        },
      },
      {
        id: id("t9-classifier"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Sentiment Classifier",
          description:
            "Classify sentiment, intent, and priority (respond now / today / monitor).",
          role: "CLASSIFIER",
        },
      },
      {
        id: id("t9-response"),
        type: "agentNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Response Drafter",
          description: "Draft human-sounding responses for high-priority mentions.",
          role: "WRITER",
        },
      },
      {
        id: id("t9-slack"),
        type: "toolNode",
        position: { x: 1040, y: 0 },
        data: {
          label: "Slack: #social-monitoring",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
      {
        id: id("t9-notion"),
        type: "toolNode",
        position: { x: 1300, y: 0 },
        data: {
          label: "Log mentions in Notion",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
    ],
    edges: [
      {
        id: id("t9-e1"),
        source: id("t9-trigger"),
        target: id("t9-monitor"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t9-e2"),
        source: id("t9-monitor"),
        target: id("t9-classifier"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t9-e3"),
        source: id("t9-classifier"),
        target: id("t9-response"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t9-e4"),
        source: id("t9-response"),
        target: id("t9-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t9-e5"),
        source: id("t9-classifier"),
        target: id("t9-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData({ label: "Log for weekly review" }),
      },
    ],
  },
  {
    id: "weekly-business-digest",
    name: "Weekly Business Digest",
    description:
      "Synthesize leads, tickets, content, and Slack wins into an executive-ready Friday digest.",
    category: "Executive",
    targetTeams: "Leadership, All",
    mode: "FLOW",
    nodes: [
      {
        id: id("t10-trigger"),
        type: "eventNode",
        position: { x: 0, y: 0 },
        data: {
          label: "Every Friday 4pm",
          source: "SCHEDULE",
          triggerType: "CRON",
        },
      },
      {
        id: id("t10-collector"),
        type: "agentNode",
        position: { x: 260, y: 0 },
        data: {
          label: "Weekly Data Collector",
          description:
            "Pull new leads, tickets, published content, and #wins Slack messages for the week.",
          role: "COLLECTOR",
        },
      },
      {
        id: id("t10-analyst"),
        type: "agentNode",
        position: { x: 520, y: 0 },
        data: {
          label: "Business Analyst",
          description:
            "Compare this week vs. last week and find wins, declines, anomalies, and insights.",
          role: "ANALYST",
        },
      },
      {
        id: id("t10-writer"),
        type: "agentNode",
        position: { x: 780, y: 0 },
        data: {
          label: "Digest Writer",
          description: "Write 3-2-1 style executive digest (3 wins, 2 risks, 1 focus).",
          role: "WRITER",
        },
      },
      {
        id: id("t10-notion"),
        type: "toolNode",
        position: { x: 1040, y: 0 },
        data: {
          label: "Save digest to Notion",
          provider: "NOTION",
          action: "CREATE_PAGE",
        },
      },
      {
        id: id("t10-slack"),
        type: "toolNode",
        position: { x: 1300, y: 0 },
        data: {
          label: "Slack: #general",
          provider: "SLACK",
          action: "SEND_MESSAGE",
        },
      },
      {
        id: id("t10-gmail"),
        type: "toolNode",
        position: { x: 1560, y: 0 },
        data: {
          label: "Email digest to leadership",
          provider: "GMAIL",
          action: "SEND_EMAIL",
        },
      },
    ],
    edges: [
      {
        id: id("t10-e1"),
        source: id("t10-trigger"),
        target: id("t10-collector"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t10-e2"),
        source: id("t10-collector"),
        target: id("t10-analyst"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t10-e3"),
        source: id("t10-analyst"),
        target: id("t10-writer"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t10-e4"),
        source: id("t10-writer"),
        target: id("t10-notion"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t10-e5"),
        source: id("t10-notion"),
        target: id("t10-slack"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
      {
        id: id("t10-e6"),
        source: id("t10-slack"),
        target: id("t10-gmail"),
        type: "flowEdge",
        animated: true,
        data: edgeData(),
      },
    ],
  },
];

export function getWorkforceTemplate(id: WorkforceTemplateId): WorkforceTemplate | undefined {
  return WORKFORCE_TEMPLATES.find((t) => t.id === id);
}

