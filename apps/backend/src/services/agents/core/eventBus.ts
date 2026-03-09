
import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Event Bus for Agent System
 * Decouples heavy operations from the main request flow.
 */
@Injectable()
export class EventBus {
    private emitter: EventEmitter;

    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(20);
    }

    /**
     * Publish an event
     */
    async publish(eventName: string, data: any): Promise<void> {
        this.emitter.emit(eventName, data);
        // Note: native emit is synchronous usually, but handlers can be async.
        // We don't await handlers here for loosely coupled events.
    }

    /**
     * Subscribe to an event
     */
    subscribe(eventName: string, handler: (data: any) => Promise<void> | void): void {
        this.emitter.on(eventName, handler);
    }
}

export const eventBus = new EventBus();

// Event Types
export const AGENT_EVENTS = {
    BUILDER: {
        CONFIG_EXTRACTED: 'agent.builder.config_extracted',
        STAGE_CHANGED: 'agent.builder.stage_changed',
        AGENT_UPDATED: 'agent.builder.agent_updated',
    },
    EXECUTION: {
        STARTED: 'agent.execution.started',
        COMPLETED: 'agent.execution.completed',
        FAILED: 'agent.execution.failed',
        TOOL_CALLED: 'agent.execution.tool_called',
    },
};
