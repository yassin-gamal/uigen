# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest src/lib/__tests__/file-system.test.ts

# Reset the database
npm run db:reset

# After schema changes, regenerate Prisma client and migrate
npx prisma generate && npx prisma migrate dev
```

## Code Style

Add comments when logic is non-obvious or complex. Skip comments for self-evident code.

## Architecture Overview

UIGen is a Next.js 15 (App Router) application that lets users generate React components via AI chat with a live preview.

### Data Flow

1. User types a message in `ChatInterface` → sent to `POST /api/chat`
2. API route reconstructs a `VirtualFileSystem` from serialized data, then calls `streamText` (Vercel AI SDK) with two tools: `str_replace_editor` and `file_manager`
3. The AI streams back tool calls that create/modify virtual files
4. On the client, `ChatProvider` (wraps `useAIChat`) intercepts tool calls via `onToolCall` and routes them to `FileSystemContext.handleToolCall`, which mutates the in-memory `VirtualFileSystem`
5. `PreviewFrame` watches the file system, transpiles JSX/TSX files via `@babel/standalone`, generates an import map with blob URLs (+ esm.sh for third-party packages), and renders the result in an `<iframe>`
6. After streaming finishes, if a `projectId` is set, the API serializes and saves the full message history + file system state to SQLite (Prisma)

### Key Abstractions

**`VirtualFileSystem`** (`src/lib/file-system.ts`): An in-memory file tree (no disk writes). Supports CRUD, rename (recursive), serialize/deserialize, and text editor commands (`viewFile`, `replaceInFile`, `insertInFile`). Used on both server (API route) and client (context).

**`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): React context wrapping `VirtualFileSystem`. Provides `handleToolCall` to translate AI tool calls (`str_replace_editor`, `file_manager`) into VFS mutations. Uses a `refreshTrigger` counter to force re-renders since the VFS instance is stable.

**`ChatContext`** (`src/lib/contexts/chat-context.tsx`): Thin wrapper around `useAIChat` from `@ai-sdk/react`. Serializes the current VFS state into the request body on every submission. Tracks anonymous user work in `sessionStorage`.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Client-side pipeline—`transformJSX` uses Babel standalone to compile JSX/TSX; `createImportMap` generates an ES module import map with blob URLs for local files and `esm.sh` URLs for third-party packages; `createPreviewHTML` builds the full iframe HTML with an `ErrorBoundary` and tailwind CDN.

**AI Provider** (`src/lib/provider.ts`): Returns `anthropic("claude-haiku-4-5")` when `ANTHROPIC_API_KEY` is set; otherwise falls back to `MockLanguageModel` which generates static Counter/Card/Form components without an API call.

### Authentication

JWT-based auth stored in an `httpOnly` cookie (`auth-token`). `src/lib/auth.ts` handles session creation/verification using `jose`. `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes. Anonymous users can use the app without signing in; their work is saved in `sessionStorage` via `anon-work-tracker.ts` and can be migrated to an account on sign-up.

### AI Tools Provided to the Model

- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): `view`, `create`, `str_replace`, `insert` commands on the VFS
- **`file_manager`** (`src/lib/tools/file-manager.ts`): `rename`, `delete` commands on the VFS

### Database

SQLite via Prisma. Always refer to `prisma/schema.prisma` as the source of truth for the database structure. Generated client output is `src/generated/prisma`.

### Routing

- `/` — anonymous landing or redirect to most recent project for authenticated users
- `/[projectId]` — authenticated project view; redirects to `/` if unauthenticated or project not found

### Testing

Vitest with jsdom. Tests live in `src/lib/__tests__/`. The main test suite covers `VirtualFileSystem`. Run with `npm test`.
