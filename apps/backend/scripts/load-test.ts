
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Socket.IO Load Tester
 * 
 * Simulates multiple users connecting to the Agentflox API Server.
 * 
 * Usage: 
 *   npx tsx scripts/load-test.ts [TOTAL_USERS] [RAMP_UP_MS]
 * 
 * Example:
 *   npx tsx scripts/load-test.ts 1000 60000
 *   (1000 users over 60 seconds)
 */

const URL = process.env.SOCKET_URL || 'http://localhost:3002'; // Adjust port if needed
const API_URL = URL.replace('ws://', 'http://').replace('wss://', 'https://');
const TOTAL_USERS = parseInt(process.argv[2] || '500', 10);
const RAMP_UP_TIME = parseInt(process.argv[3] || '30000', 10); // 30 seconds default
const DELAY_BETWEEN_CONNECTIONS = Math.max(10, RAMP_UP_TIME / TOTAL_USERS);

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
    console.error('❌ Error: JWT_SECRET or NEXTAUTH_SECRET not found in .env');
    process.exit(1);
}

console.log(`🚀 Starting Load Test`);
console.log(`Target: ${URL}`);
console.log(`Users: ${TOTAL_USERS}`);
console.log(`Ramp Up: ${RAMP_UP_TIME}ms (~${Math.round(1000 / DELAY_BETWEEN_CONNECTIONS)} users/sec)`);

let activeConnections = 0;
let errors = 0;
let latencies: number[] = [];
const sockets: Socket[] = [];

// metrics
const metricsInterval = setInterval(() => {
    const avgLatency = latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;

    console.log(`[Stats] Active: ${activeConnections} | Errors: ${errors} | Avg Latency: ${avgLatency}ms | Progress: ${sockets.length}/${TOTAL_USERS}`);
    latencies = []; // Reset for next interval
}, 1000);

function generateToken(userId: string) {
    return jwt.sign(
        {
            id: userId,
            sub: userId,
            email: `${userId}@loadtest.com`,
            name: `Load Test User ${userId}`
        },
        JWT_SECRET!,
        { expiresIn: '1h' }
    );
}

async function connectUser(index: number) {
    const userId = `load-test-${index}-${uuidv4().substring(0, 8)}`;
    const workspaceId = `load-test-workspace`;
    const token = generateToken(userId);

    const socket = io(URL, {
        transports: ['websocket'],
        auth: { token },
        query: { workspaceId },
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    const start = Date.now();

    socket.on('connect', () => {
        const latency = Date.now() - start;
        latencies.push(latency);
        activeConnections++;

        // Start Heartbeat
        const heartbeat = setInterval(() => {
            if (socket.connected) {
                const pingStart = Date.now();
                socket.emit('heartbeat', () => {
                    const pingLatency = Date.now() - pingStart;
                    latencies.push(pingLatency);
                });
            } else {
                clearInterval(heartbeat);
            }
        }, 10000 + Math.random() * 5000); // Randomize heartbeat to avoid thundering herd

        // Clean up on disconnect
        socket.on('disconnect', () => {
            clearInterval(heartbeat);
        });
    });

    socket.on('connect_error', (err) => {
        if (errors < 10) { // Don't spam console
            console.error(`[Conn Error ${index}]`, err.message);
        }
        errors++;
    });

    socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
            activeConnections--;
        }
    });

    sockets.push(socket);
}

// Ramp up loop
let userCount = 0;
const interval = setInterval(() => {
    if (userCount >= TOTAL_USERS) {
        clearInterval(interval);
        console.log('✅ All connection attempts initiated. Waiting for stability...');
        return;
    }
    connectUser(userCount++);
}, DELAY_BETWEEN_CONNECTIONS);

// Keep alive
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping load test...');
    clearInterval(metricsInterval);
    clearInterval(interval);
    sockets.forEach(s => s.disconnect());
    console.log('✅ Cleanup complete');
    process.exit();
});
