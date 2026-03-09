# Package Installation Commands

## Important Note
PowerShell script execution is disabled on your system. Use one of these methods to install the required packages:

## Method 1: Command Prompt (Recommended)

Open Command Prompt (cmd.exe) and run:

```cmd
cd c:\Users\datng\agentflox

REM Install frontend collaboration packages
pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb

REM Install backend collaboration packages
pnpm --filter service-server add yjs y-protocols lib0
```

## Method 2: PowerShell with Explicit Bypass

If you prefer PowerShell, run each command with execution policy bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "cd c:\Users\datng\agentflox; pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb"

powershell -ExecutionPolicy Bypass -Command "cd c:\Users\datng\agentflox; pnpm --filter service-server add yjs y-protocols lib0"
```

## Method 3: Enable Script Execution (Permanent Fix)

If you want to permanently enable script execution in PowerShell:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Then you can run the original commands:

```powershell
cd c:\Users\datng\agentflox
pnpm --filter agentflox add yjs y-protocols @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor y-indexeddb
pnpm --filter service-server add yjs y-protocols lib0
```

## Verify Installation

After installing, verify the packages were added:

```cmd
cd c:\Users\datng\agentflox\apps\frontend
type package.json | findstr yjs

cd c:\Users\datng\agentflox\apps\backend
type package.json | findstr yjs
```

You should see the packages listed in the dependencies.
