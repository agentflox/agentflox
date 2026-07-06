import type OpenAI from 'openai'

import { prisma } from '@/lib/prisma'
import { getJson, setJson } from '@/lib/redis'

export const CHAT_CONTEXT_TTL_SECONDS = 60 * 60 * 12 // 12 hours

export type ChatContextType = 'project' | 'profile' | 'proposal' | 'team' | 'workspace' | 'space' | 'channel' | 'task' | 'list' | 'folder'

export type ChatContextCache = {
  contextType: ChatContextType
  entityId: string
  embedding?: number[]
  summary?: string
  entityName?: string
  fullData?: Record<string, any>
  lastUpdatedAt: number
}

const EXCLUDED_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'id',
  'userId',
  'user_id',
  'ownerId',
  'owner_id',
  'password',
  'refresh_token',
  'access_token',
  'sessionToken',
  'session_token',
])

function sanitizeEntityData(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {}
  
  const sanitized: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (EXCLUDED_FIELDS.has(key)) continue
    
    if (value === null || value === undefined) continue
    
    if (Array.isArray(value)) {
      sanitized[key] = value
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      sanitized[key] = sanitizeEntityData(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

function buildSummaryFromData(data: Record<string, any>): string {
  const parts: string[] = []
  
  if (data.name) parts.push(`Name: ${data.name}`)
  if (data.title) parts.push(`Title: ${data.title}`)
  if (data.description) parts.push(`Description: ${data.description}`)
  if (data.detailedDesc) parts.push(`Details: ${data.detailedDesc}`)
  if (data.shortSummary) parts.push(`Summary: ${data.shortSummary}`)
  if (data.tagline) parts.push(`Tagline: ${data.tagline}`)
  if (data.bio) parts.push(`Bio: ${data.bio}`)
  if (data.targetMarket) parts.push(`Target Market: ${data.targetMarket}`)
  if (data.competitiveEdge) parts.push(`Competitive Edge: ${data.competitiveEdge}`)
  if (data.industry && Array.isArray(data.industry)) {
    parts.push(`Industries: ${data.industry.join(', ')}`)
  }
  if (data.tags && Array.isArray(data.tags)) {
    parts.push(`Tags: ${data.tags.join(', ')}`)
  }
  if (data.skills && Array.isArray(data.skills)) {
    parts.push(`Skills: ${data.skills.join(', ')}`)
  }
  
  return parts.join('\n\n')
}

export function getChatContextKey(conversationId: string) {
  return `chat:${conversationId}:context`
}

/**
 * Compare two objects deeply to check if they're different
 */
function isDataDifferent(oldData: Record<string, any>, newData: Record<string, any>): boolean {
  if (!oldData && newData) return true
  if (oldData && !newData) return true
  if (!oldData && !newData) return false

  const oldKeys = Object.keys(oldData).sort()
  const newKeys = Object.keys(newData).sort()

  if (oldKeys.length !== newKeys.length) return true

  for (const key of oldKeys) {
    if (!newKeys.includes(key)) return true

    const oldValue = oldData[key]
    const newValue = newData[key]

    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) return true
    } else if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue !== null && newValue !== null) {
      if (isDataDifferent(oldValue, newValue)) return true
    } else if (oldValue !== newValue) {
      return true
    }
  }

  return false
}

export async function ensureChatContext(
  conversationId: string,
  contextType: ChatContextType,
  entityId: string,
  openai: OpenAI
): Promise<ChatContextCache> {
  const redisKey = getChatContextKey(conversationId)
  const cached = await getJson<ChatContextCache>(redisKey)
  
  let entityData: any = null
  let entityName: string | undefined

  const db = prisma as any

  switch (contextType) {
    case 'project': {
      entityData = await db.project.findUnique({
        where: { id: entityId },
      })
      entityName = entityData?.name
      break
    }
    case 'profile': {
      entityData = await db.user.findUnique({
        where: { id: entityId },
        include: {
          founderProfile: true,
          investorProfile: true,
          memberProfile: true,
        },
      })
      entityName = entityData?.name || entityData?.email
      break
    }
    case 'proposal': {
      entityData = await db.proposal.findUnique({
        where: { id: entityId },
        include: {
          budget: true,
          location: true,
          contact: true,
          cofounder: true,
          customer: true,
          investor: true,
          mentor: true,
          partner: true,
          membership: true,
          team: true,
          timeline: true,
        },
      })
      entityName = entityData?.title
      break
    }
    case 'team': {
      entityData = await db.team.findUnique({
        where: { id: entityId },
        include: {
          members: true,
          projects: true,
        },
      })
      entityName = entityData?.name
      break
    }
    case 'workspace': {
      entityData = await db.workspace.findUnique({
        where: { id: entityId },
        include: {
          spaces: {
            select: { id: true, name: true, description: true, isActive: true },
          },
          projects: {
            select: { id: true, name: true, status: true },
          },
          teams: {
            select: { id: true, name: true, description: true },
          },
          channels: {
            select: { id: true, name: true, description: true },
          },
          tools: {
            select: { id: true, name: true, category: true },
          },
          materials: {
            select: { id: true, title: true, category: true },
          },
        },
      })
      entityName = entityData?.name
      break
    }
    case 'space': {
      entityData = await db.space.findUnique({
        where: { id: entityId },
        include: {
          workspace: { select: { id: true, name: true } },
          folders: true,
          lists: true,
          tools: true,
          materials: true,
          tasks: true,
        },
      })
      entityName = entityData?.name
      break
    }
    case 'channel': {
      entityData = await db.channel.findUnique({
        where: { id: entityId },
        include: {
          workspace: { select: { id: true, name: true } },
          members: {
            select: {
              user: { select: { id: true, name: true, email: true } },
              role: true,
            },
          },
        },
      })
      entityName = entityData?.name
      break
    }
    case 'task': {
      entityData = await db.task.findUnique({
        where: { id: entityId },
        include: {
          status: { select: { id: true, name: true, color: true } },
          list: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      })
      entityName = entityData?.title
      break
    }
    case 'list': {
      entityData = await db.list.findUnique({
        where: { id: entityId },
        include: {
          folder: { select: { id: true, name: true } },
          space: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          workspace: { select: { id: true, name: true } },
          statuses: { select: { id: true, name: true, color: true } },
        },
      })
      entityName = entityData?.name
      break
    }
    case 'folder': {
      entityData = await db.folder.findUnique({
        where: { id: entityId },
        include: {
          space: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          workspace: { select: { id: true, name: true } },
          lists: { select: { id: true, name: true } },
        },
      })
      entityName = entityData?.name
      break
    }
  }

  if (!entityData) {
    const context: ChatContextCache = {
      contextType,
      entityId,
      lastUpdatedAt: Date.now(),
    }
    await setJson(redisKey, context, CHAT_CONTEXT_TTL_SECONDS)
    return context
  }

  const sanitizedData = sanitizeEntityData(entityData)
  
  // Check if cached data exists and is the same
  if (cached && cached.contextType === contextType && cached.entityId === entityId) {
    // Compare the full data to see if anything changed
    const dataChanged = isDataDifferent(cached.fullData || {}, sanitizedData)
    
    if (!dataChanged) {
      // Data is the same, return cached version
      return cached
    }
    
    // Data has changed, we need to update the cache
    console.log(`Cache invalidated for ${contextType} ${entityId} - data has changed`)
  }

  const summary = buildSummaryFromData(sanitizedData)

  let embedding: number[] | undefined
  if (summary) {
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: summary,
      })
      embedding = embeddingResponse.data[0]?.embedding
    } catch (error) {
      console.warn('Failed to create embedding for chat context', error)
    }
  }

  const context: ChatContextCache = {
    contextType,
    entityId,
    embedding,
    summary,
    entityName,
    fullData: sanitizedData,
    lastUpdatedAt: Date.now(),
  }

  await setJson(redisKey, context, CHAT_CONTEXT_TTL_SECONDS)

  return context
}
