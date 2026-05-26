# 历史会话列表 UI 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Web Agent 中实现可切换的历史会话列表 UI

**Architecture:** 利用 `useLangGraphRuntime` 的 `unstable_threadListAdapter` 注入 `LangGraphThreadListAdapter`，使用 `ThreadListPrimitive` 原语渲染侧边栏列表

**Tech Stack:** Next.js 16, assistant-ui 0.14, LangGraph SDK, assistant-stream

---

### Task 1: LangGraphThreadListAdapter

**Files:**

- Create: `frontend/lib/langgraph-thread-list-adapter.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd frontend
npm ls assistant-stream
```

Expected: `assistant-stream` 已存在（在 `node_modules` 中）。如不存在则安装。

- [ ] **Step 2: 写入 adapter 实现**

```typescript
import { Client } from "@langchain/langgraph-sdk";
import { createAssistantStream } from "assistant-stream";
import type {
  RemoteThreadListAdapter,
  RemoteThreadInitializeResponse,
  RemoteThreadListPageOptions,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";

export class LangGraphThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private client: Client) {}

  async list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse> {
    const offset = params?.after ? Number(params.after) : 0;
    const result = await this.client.threads.search<Record<string, unknown>>({
      limit: 20,
      offset,
      sortBy: "updated_at",
      sortOrder: "desc",
    });
    return {
      threads: result.map((t) => ({
        remoteId: t.thread_id,
        status: (t.metadata?.status as "regular" | "archived") ?? "regular",
        title: t.metadata?.title as string | undefined,
      })),
      nextCursor: result.length === 20 ? String(offset + 20) : undefined,
    };
  }

  async initialize(localId: string): Promise<RemoteThreadInitializeResponse> {
    const thread = await this.client.threads.create({
      metadata: { title: "新会话" },
    });
    return { remoteId: thread.thread_id, externalId: thread.thread_id };
  }

  async rename(remoteId: string, newTitle: string): Promise<void> {
    await this.client.threads.update(remoteId, {
      metadata: { title: newTitle },
    });
  }

  async delete(remoteId: string): Promise<void> {
    await this.client.threads.delete(remoteId);
  }

  async fetch(remoteId: string): Promise<RemoteThreadMetadata> {
    const thread = await this.client.threads.get(remoteId);
    return {
      remoteId: thread.thread_id,
      status: (thread.metadata?.status as "regular" | "archived") ?? "regular",
      title: thread.metadata?.title as string | undefined,
    };
  }

  async generateTitle(_remoteId: string, messages: readonly ThreadMessage[]): Promise<ReturnType<typeof createAssistantStream>> {
    return createAssistantStream(async (controller) => {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const text = firstUser.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join(" ");
        controller.appendText(text.slice(0, 50) + (text.length > 50 ? "..." : ""));
      } else {
        controller.appendText("新会话");
      }
    }) as unknown as ReturnType<typeof createAssistantStream>;
  }

  async archive(remoteId: string): Promise<void> {
    await this.client.threads.update(remoteId, {
      metadata: { status: "archived" },
    });
  }

  async unarchive(remoteId: string): Promise<void> {
    await this.client.threads.update(remoteId, {
      metadata: { status: "regular" },
    });
  }
}
```

- [ ] **Step 3: 验证无 TypeScript 错误**

```bash
cd frontend
npx tsc --noEmit lib/langgraph-thread-list-adapter.ts
```

Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add frontend/lib/langgraph-thread-list-adapter.ts
git commit -m "feat: add LangGraphThreadListAdapter for thread list management"
```

---

### Task 2: ThreadList 组件

**Files:**

- Create: `frontend/components/thread-list.tsx`

- [ ] **Step 1: 写入 ThreadList 组件**

```typescript
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import type { FC } from "react";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="flex flex-col gap-1 p-2">
      <ThreadListNew />
      <AuiIf condition={(s) => s.threads.isLoading}>
        <ThreadListSkeleton />
      </AuiIf>
      <AuiIf condition={(s) => !s.threads.isLoading}>
        <ThreadListPrimitive.Items>
          {() => <ThreadListItem />}
        </ThreadListPrimitive.Items>
      </AuiIf>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <Button
        variant="outline"
        className="h-9 justify-start gap-2 rounded-lg px-3 text-sm hover:bg-muted data-active:bg-muted"
      >
        <PlusIcon className="size-4" />
        New Thread
      </Button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label="Loading threads"
          className="flex h-9 items-center px-3"
        >
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="group flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none data-active:bg-muted">
      <ThreadListItemPrimitive.Trigger className="flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm">
        <span className="min-w-0 flex-1 truncate">
          <ThreadListItemPrimitive.Title fallback="New Chat" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC = () => {
  return (
    <ThreadListItemMorePrimitive.Root>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="me-2 size-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:bg-accent data-[state=open]:opacity-100 group-data-active:opacity-100"
        >
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">More options</span>
        </Button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="bottom"
        align="start"
        className="z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
            <ArchiveIcon className="size-4" />
            Archive
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-destructive text-sm outline-none hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive">
            <TrashIcon className="size-4" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
```

- [ ] **Step 2: 验证编译**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add frontend/components/thread-list.tsx
git commit -m "feat: add ThreadList component using ThreadListPrimitive"
```

---

### Task 3: 修改 assistant.tsx — 集成 adapter + 双栏布局

**Files:**

- Modify: `frontend/app/assistant.tsx`

- [ ] **Step 1: 读取当前 assistant.tsx 内容**

```bash
cat frontend/app/assistant.tsx
```

确认当前代码内容。

- [ ] **Step 2: 重写 assistant.tsx**

将文件内容替换为：

```typescript
"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  unstable_createLangGraphStream,
  useLangGraphRuntime,
  type LangChainMessage,
} from "@assistant-ui/react-langgraph";

import { createClient } from "@/lib/chatApi";
import { LangGraphThreadListAdapter } from "@/lib/langgraph-thread-list-adapter";
import { Thread } from "@/components/thread";
import { ThreadList } from "@/components/thread-list";

const ASSISTANT_ID = process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID!;

export function Assistant() {
  const client = useMemo(() => createClient(), []);
  const adapter = useMemo(() => new LangGraphThreadListAdapter(client), [client]);
  const stream = useMemo(
    () =>
      unstable_createLangGraphStream({
        client,
        assistantId: ASSISTANT_ID,
      }),
    [client],
  );

  const runtime = useLangGraphRuntime({
    stream,
    unstable_allowCancellation: true,
    unstable_threadListAdapter: adapter,
    load: async (threadId) => {
      const state = await client.threads.getState<{
        messages: LangChainMessage[];
      }>(threadId);
      return {
        messages: state.values.messages,
        interrupts: state.tasks[0]?.interrupts,
      };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full">
        <div className="w-60 shrink-0 border-r">
          <ThreadList />
        </div>
        <div className="flex min-w-0 flex-1">
          <Thread />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
```

- [ ] **Step 3: 验证编译**

```bash
cd frontend
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add frontend/app/assistant.tsx
git commit -m "feat: integrate thread list adapter and sidebar layout"
```

---

### Task 4: 端到端验证

**Files:** 无，验证功能

- [ ] **Step 1: 启动后端**

在另一个终端：

```bash
cd backend
langgraph dev
```

Expected: LangGraph Server 启动，默认端口 2024

- [ ] **Step 2: 启动前端**

```bash
cd frontend
npm run dev
```

Expected: Next.js 开发服务器启动，默认端口 3000

- [ ] **Step 3: 功能验证**

验证以下场景：

1. 页面加载 → 左侧显示侧边栏（空列表），右侧显示聊天欢迎页面
2. 点击 "New Thread" → 右侧新建会话，侧边栏出现 "新会话" 条目
3. 发送第一条消息 → 自动生成标题（首条消息截取 50 字）
4. 点击 "New Thread" 再次 → 新建另一个会话，可切换
5. 点击侧边栏中的历史会话 → 切换成功，加载历史消息
6. 会话条目 hover → 显示 "..." 更多按钮
7. 点击 "..." → Archive / Delete 菜单
8. 点击 Delete → 删除成功，列表刷新
9. 刷新页面 → 会话列表仍然存在（LangGraph Server 持久化）

- [ ] **Step 4: 提交最终状态**

```bash
git add -A
git commit -m "feat: complete thread list UI implementation"
```
