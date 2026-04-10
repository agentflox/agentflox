import winston from 'winston';
import { v4 as uuid } from 'uuid';
import { hostname } from 'node:os';

// #region agent log
;(globalThis as any).fetch?.('http://127.0.0.1:7244/ingest/4c797376-744f-4697-8a4d-c0ab67676756',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H1',location:'apps/backend/src/lib/logger.ts:4',message:'logger module loaded (ESM-safe)',data:{node:process.version,hasFetch:typeof (globalThis as any).fetch === 'function'},timestamp:Date.now()})}).catch(()=>{});
// #endregion

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'websocket-server',
        instanceId: process.env.INSTANCE_ID || hostname()
    },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

export function createContextLogger(context: Record<string, any>) {
    const correlationId = uuid();
    return logger.child({ correlationId, ...context });
}

export default logger;
