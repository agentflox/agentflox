#!/usr/bin/env node

import { spawn } from 'node:child_process';

const processes = [];
let shuttingDown = false;

const terminateProcess = (proc, signal = 'SIGTERM') => {
  if (proc.child.killed) {
    return;
  }
  try {
    proc.child.kill(signal);
  } catch (err) {
    console.error(`[startup] Failed to send ${signal} to ${proc.name}:`, err);
  }
};

const terminateOthers = (current) => {
  processes
    .filter((proc) => proc.child !== current)
    .forEach((proc) => terminateProcess(proc));
};

const handleChildExit = (name, child) => (code, signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
  console.log(
    `[startup] ${name} exited with ${code !== null ? `code ${code}` : `signal ${signal}`}`
  );
  terminateOthers(child);

  // Give the sibling process a moment to exit gracefully before shutting down.
  setTimeout(() => {
    process.exit(exitCode);
  }, 200);
};

const startProcess = (name, command, args) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  console.log(`[startup] Started ${name} (pid ${child.pid})`);

  const proc = { name, child };
  processes.push(proc);

  child.on('exit', handleChildExit(name, child));
  child.on('error', (error) => {
    console.error(`[startup] Failed to start ${name}:`, error);
    shuttingDown = true;
    terminateOthers(child);
    process.exit(1);
  });
};

const gracefulShutdown = (signal) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[startup] Received ${signal}, shutting down...`);
  processes.forEach((proc) => terminateProcess(proc, signal));
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startProcess('api', 'node', ['dist/main.api.js']);
startProcess('worker', 'node', ['dist/main.worker.js']);

