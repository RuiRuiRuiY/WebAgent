# 用 `assistant-ui` 把 **LangGraph 后端**接到一个 React 聊天界面上。整体作用是：

* 创建 LangGraph client
* 建立流式通信
* 把 LangGraph 的线程状态映射到 `assistant-ui`
* 用 `Thread` 渲染聊天 UI

我按块给你解释。

---

## 1) `"use client";`

**tsx**

```
"use client";
```

这是 Next.js App Router 里的客户端组件标记。

因为这段代码里用了：

* `useMemo`
* `useLangGraphRuntime`
* 浏览器端交互

所以必须在客户端执行。

---

## 2) 导入依赖

**tsx**

```
import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  unstable_createLangGraphStream,
  useLangGraphRuntime,
  type LangChainMessage,
} from "@assistant-ui/react-langgraph";

import { createClient } from "@/lib/chatApi";
import { Thread } from "@/components/thread";
```

### 这些分别做什么：

#### `useMemo`

用来缓存对象，避免每次渲染都重新创建 `client` 和 `stream`。

#### `AssistantRuntimeProvider`

这是 `assistant-ui` 的上下文提供器。
它把 `runtime` 传给下面的 `Thread` 组件，让 UI 知道：

* 当前消息列表
* 发送消息
* 是否在生成中
* 中断/恢复等状态

#### `unstable_createLangGraphStream`

创建一个 LangGraph 的流式连接，负责把 LangGraph 后端输出接到前端。

#### `useLangGraphRuntime`

把 LangGraph 的 `stream` 包装成 `assistant-ui` 能理解的 runtime。

#### `LangChainMessage`

LangGraph 里返回的消息类型。

#### `createClient`

你自己项目里的 API client，用来访问 LangGraph 服务。

#### `Thread`

聊天界面组件，负责把对话线程渲染出来。

---

## 3) Assistant ID

**tsx**

```
const ASSISTANT_ID = process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID!;
```

这是从环境变量里读取 LangGraph assistant 的 ID。

### 重点：

* `NEXT_PUBLIC_` 前缀表示它会暴露到浏览器端
* `!` 表示你告诉 TypeScript：“这个值一定存在”

如果环境变量没配好，这里运行时会出问题。

---

## 4) `Assistant` 组件

**tsx**

```
export function Assistant() {
```

这是你真正渲染聊天 UI 的组件。

---

## 5) 创建 client

**tsx**

```
const client = useMemo(() => createClient(), []);
```

这里调用你自己的 `createClient()`，生成一个 LangGraph API client。

`useMemo(..., [])` 的意思是只创建一次，避免每次渲染都重新实例化。

---

## 6) 创建 stream

**tsx**

```
const stream = useMemo(
  () =>
    unstable_createLangGraphStream({
      client,
      assistantId: ASSISTANT_ID,
    }),
  [client],
);
```

这一步创建 LangGraph 的流连接。

### 它的作用：

当用户发送消息时，`assistant-ui` 需要把消息发给 LangGraph，然后接收实时返回。

这里指定了：

* `client`: 用哪个后端 client
* `assistantId`: 对应哪一个 LangGraph assistant

---

## 7) 创建 runtime

**tsx**

```
const runtime = useLangGraphRuntime({
  unstable_allowCancellation: true,
  stream,
  create: async () => {
    const { thread_id } = await client.threads.create();
    return { externalId: thread_id };
  },
  load: async (externalId) => {
    const state = await client.threads.getState<{
      messages: LangChainMessage[];
    }>(externalId);
    return {
      messages: state.values.messages,
      interrupts: state.tasks[0]?.interrupts,
    };
  },
});
```

这是最核心的部分。

`useLangGraphRuntime` 的作用是：
把 LangGraph 的线程、状态、流处理方式转换成 `assistant-ui` 的 runtime。

### 配置项解释：

---

### `unstable_allowCancellation: true`

表示允许用户取消当前生成过程。

比如助手正在输出时，用户可以点停止。

---

### `stream`

就是刚才创建的 LangGraph 流对象，用来处理实时消息传输。

---

### `create`

**tsx**

```
create: async () => {
  const { thread_id } = await client.threads.create();
  return { externalId: thread_id };
},
```

这个函数负责 **新建一个 LangGraph thread** 。

### 发生什么：

1. 调用后端 `client.threads.create()`
2. 后端返回一个 `thread_id`
3. `assistant-ui` 把这个 `thread_id` 当成 `externalId`

### 为什么叫 `externalId`

因为 `assistant-ui` 自己只关心一个“线程 ID”，
而你的真实线程 ID 是 LangGraph 的 `thread_id`，所以这里做了一层映射。

---

### `load`

**tsx**

```
load: async (externalId) => {
  const state = await client.threads.getState<{
    messages: LangChainMessage[];
  }>(externalId);
  return {
    messages: state.values.messages,
    interrupts: state.tasks[0]?.interrupts,
  };
},
```

这个函数负责 **根据线程 ID 加载已有对话状态** 。

### 具体做什么：

1. 用 `externalId` 去请求 LangGraph thread 状态
2. 拿到该线程当前所有消息 `messages`
3. 如果有中断任务，就把 `interrupts` 也返回

### 返回值里：

* `messages`: 当前线程里的聊天消息
* `interrupts`: 当前是否有需要处理的中断

---

## 8) 提供 runtime

**tsx**

```
return (
  <AssistantRuntimeProvider runtime={runtime}>
    <Thread />
  </AssistantRuntimeProvider>
);
```

这一步把 `runtime` 注入给子组件。

### 结果：

`Thread` 组件就能自动拿到当前聊天状态，并负责：

* 显示消息列表
* 处理输入框
* 发送消息
* 显示生成状态

---

# 一句话总结

这段代码就是：

> **把 LangGraph 的 thread/stream/state 接到 assistant-ui，然后用 `Thread` 渲染一个完整的聊天界面。**
