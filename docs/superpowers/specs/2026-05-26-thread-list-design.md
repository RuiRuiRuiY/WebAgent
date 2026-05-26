# 历史会话列表 UI 设计文档

> **日期**: 2026-05-26
> **项目**: Web Agent
> **状态**: 已批准

## 1. 目标

在 Web Agent 中实现历史会话列表 UI，支持多会话管理（新建、切换、重命名、删除、分页），让用户可以恢复和切换历史对话。

## 2. 技术方案

### 核心思路

利用 assistant-ui 的现有框架：

- **`useLangGraphRuntime`** 的 `unstable_threadListAdapter` 选项注入 `RemoteThreadListAdapter`
- **`ThreadListPrimitive`**、**`ThreadListItemPrimitive`** 等官方原语渲染 UI
- **不引入新状态管理**，assistant-ui 内部管理线程列表状态

### 为什么要用 `unstable_threadListAdapter` 而不是 `useRemoteThreadListRuntime`

`useLangGraphRuntime` 原生支持 `unstable_threadListAdapter` 参数，接受一个 `RemoteThreadListAdapter`。当提供此参数时：

- `create`/`delete` 回调被忽略，adapter 全权负责线程生命周期
- `externalId` 来自 adapter 的 `list()` / `initialize()`，直接传给 `load` 回调
- 无需额外包装 `runtimeHook`，集成更简洁

### 后端零改动

所有操作都通过 LangGraph SDK 的 REST API 完成（前端已有的 API proxy route 已代理）：

| 操作       | LangGraph SDK                                            | 路径                     |
| ---------- | -------------------------------------------------------- | ------------------------ |
| 创建线程   | `client.threads.create({ metadata })`                  | `POST /threads`        |
| 列表查询   | `client.threads.search({ sortBy: "updated_at", ... })` | `GET /threads/search`  |
| 重命名     | `client.threads.update(id, { metadata: { title } })`   | `PATCH /threads/{id}`  |
| 删除       | `client.threads.delete(id)`                            | `DELETE /threads/{id}` |
| 获取元数据 | `client.threads.get(id)`                               | `GET /threads/{id}`    |
| 标题生成   | client-side 用 `assistant-stream`                      | 无需后端                 |

## 3. 架构图

```
page.tsx
  └── <Assistant />                    ← 不变
        └── assistant.tsx              ← 修改：双栏布局 + unstable_threadListAdapter
              ├── sidebar: <ThreadList />
              └── main: <Thread />

useLangGraphRuntime({
  stream,                                    ← 现有，不变
  load,                                      ← 现有，不变
  getCheckpointId,                           ← 现有，不变
  unstable_threadListAdapter: adapter,       ← 新增
})
```

## 4. 文件改动清单

| 文件                                     | 操作   | 说明                                        |
| ---------------------------------------- | ------ | ------------------------------------------- |
| `lib/langgraph-thread-list-adapter.ts` | 新建   | `RemoteThreadListAdapter` 实现            |
| `app/assistant.tsx`                    | 修改   | 加 `unstable_threadListAdapter`，双栏布局 |
| `components/thread-list.tsx`           | 新建   | 官方 ThreadList 组件                        |
| `components/ui/skeleton.tsx`           | 已存在 | 确认已有                                    |

不动：`page.tsx`、`layout.tsx`、`thread.tsx`、`backend/*`

## 5. LangGraphThreadListAdapter 详细设计

**位置**: `frontend/lib/langgraph-thread-list-adapter.ts`

### 类型映射

```
LangGraph 线程 → RemoteThreadMetadata
  thread_id              →  remoteId
  metadata.title         →  title
  metadata.status        →  status ("regular" | "archived")
  updated_at (作排序)     →  (排序用，不出现在 metadata 中)
```

### 方法实现

```typescript
class LangGraphThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private client: Client) {}

  // 分页拉取线程列表
  async list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse> {
    const offset = params?.after ? Number(params.after) : 0;
    const result = await this.client.threads.search({
      limit: 20,
      offset,
      sortBy: "updated_at",
      sortOrder: "desc",
    });
    return {
      threads: result.map(t => ({
        remoteId: t.thread_id,
        status: (t.metadata?.status as "regular" | "archived") ?? "regular",
        title: t.metadata?.title as string | undefined,
      })),
      nextCursor: result.length === 20 ? String(offset + 20) : undefined,
    };
  }

  // 新建线程
  async initialize(localId: string): Promise<RemoteThreadInitializeResponse> {
    const thread = await this.client.threads.create({
      metadata: { title: "新会话" },
    });
    return { remoteId: thread.thread_id, externalId: thread.thread_id };
  }

  // 重命名
  async rename(remoteId: string, newTitle: string): Promise<void> {
    await this.client.threads.update(remoteId, {
      metadata: { title: newTitle },
    });
  }

  // 删除
  async delete(remoteId: string): Promise<void> {
    await this.client.threads.delete(remoteId);
  }

  // 获取单个线程元数据
  async fetch(remoteId: string): Promise<RemoteThreadMetadata> {
    const thread = await this.client.threads.get(remoteId);
    return {
      remoteId: thread.thread_id,
      status: (thread.metadata?.status as "regular" | "archived") ?? "regular",
      title: thread.metadata?.title as string | undefined,
    };
  }

  // 自动生成标题（从首条用户消息截取前50字）
  async generateTitle(_remoteId: string, messages: readonly ThreadMessage[]): Promise<AssistantStream> {
    return createAssistantStream(async (controller) => {
      const firstUser = messages.find(m => m.role === "user");
      if (firstUser) {
        const text = firstUser.content
          .filter(c => c.type === "text")
          .map(c => c.text).join(" ");
        controller.appendText(text.slice(0, 50) + (text.length > 50 ? "..." : ""));
      } else {
        controller.appendText("新会话");
      }
    });
  }

  // archive / unarchive（通过 metadata.status 标记）
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

## 6. assistant.tsx 改动

**位置**: `frontend/app/assistant.tsx`

- 保留现有的 `client`、`stream`、`load`
- 新增 `adapter` 实例
- 移除 `create` 回调（被 adapter 接管）
- 布局改为 `flex` 双栏

```typescript
export function Assistant() {
  const client = useMemo(() => createClient(), []);
  const adapter = useMemo(() => new LangGraphThreadListAdapter(client), [client]);
  const stream = useMemo(
    () => unstable_createLangGraphStream({ client, assistantId: ASSISTANT_ID }),
    [client],
  );

  const runtime = useLangGraphRuntime({
    stream,
    unstable_allowCancellation: true,
    unstable_threadListAdapter: adapter,
    load: async (threadId) => {
      const state = await client.threads.getState<{ messages: LangChainMessage[] }>(threadId);
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

## 7. ThreadList 组件

**位置**: `frontend/components/thread-list.tsx`

直接从官方 registry 复制（`npx assistant-ui add thread-list` 的产物内容），使用 `ThreadListPrimitive` 原语。

```typescript
export function ThreadList() {
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
}
```

包含三个子组件：`ThreadListNew`（新建按钮）、`ThreadListSkeleton`（加载骨架）、`ThreadListItem`（条目+更多菜单）。

## 8. ThreadList 组件中依赖

- `@assistant-ui/react` — `ThreadListPrimitive`, `ThreadListItemPrimitive`, `ThreadListItemMorePrimitive`, `AuiIf`
- `lucide-react` — `PlusIcon`, `MoreHorizontalIcon`, `ArchiveIcon`, `TrashIcon`
- `@/components/ui/button` — 已存在
- `@/components/ui/skeleton` — 已存在
- `@/components/ui/tooltip` — 已存在

## 9. 数据流

```
用户点击"新建"
  → ThreadListPrimitive.New
    → adapter.initialize(localId)
      → client.threads.create({ metadata: { title: "新会话" } })
      → { remoteId, externalId }
    → runtime 切换到新线程

用户点击历史会话
  → ThreadListItemPrimitive.Trigger
    → runtime.load(externalId)
      → client.threads.getState(threadId)
      → { messages }
    → 渲染消息列表

用户修改标题
  → ThreadListItemMorePrimitive → Rename
    → adapter.rename(remoteId, newTitle)
      → client.threads.update(threadId, { metadata: { title } })

用户删除
  → ThreadListItemMorePrimitive → Delete
    → adapter.delete(remoteId)
      → client.threads.delete(threadId)
    → 列表刷新（切换到下一个或新建）
```

## 10. 边界情况

- **空会话列表**: `AuiIf + ThreadListSkeleton` 处理 loading 状态；空列表时 `ThreadListPrimitive.Items` 渲染空白
- **标题 fallback**: `ThreadListItemPrimitive.Title` 的 `fallback="新会话"` 处理无标题场景
- **删除后切换**: assistant-ui 内部自动处理——删除当前会话后切换到下一个或新建
- **并发创建**: adapter 的 `initialize` 始终调用 `client.threads.create()`，LangGraph Server 处理唯一 ID
- **分页**: `client.threads.search` 使用 offset 分页，`nextCursor` 不为空时显示 "Load more"

## 11. 不做（MVP 范围外）

- 拖拽排序
- 批量操作
- 置顶
- 文件夹分组
- 深色/浅色模式切换（已在 globals.css 中，不额外开发）
- 移动端响应式适配
