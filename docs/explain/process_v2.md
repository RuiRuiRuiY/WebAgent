好，我给你画一个**消息从 LangGraph 后端返回，到前端渲染成 UI** 的时序图。这个更接近你真正运行时发生的事情。

---

# 运行时消息流转时序图

```txt
用户在输入框输入消息
        |
        v
[ComposerPrimitive.Input]
        |
        | 点击 Send
        v
[ComposerPrimitive.Send]
        |
        | 通过 runtime 发送消息
        v
[useLangGraphRuntime]
        |
        | 调用 stream / client
        v
[unstable_createLangGraphStream]
        |
        | 把消息发给 LangGraph 后端
        v
[LangGraph backend]
        |
        | 返回 thread state / streaming chunks
        v
[client.threads.getState / stream updates]
        |
        v
[useLangGraphRuntime]
        |
        | 更新 assistant-ui 内部状态
        v
[AssistantRuntimeProvider]
        |
        v
[Thread / Message components 自动重新渲染]
```

---

# 更细一点看

## 1) 用户输入消息

用户在 `ComposerPrimitive.Input` 里输入文本，或者拖入附件。

这时消息还只是“草稿”。

---

## 2) 点击发送

```tsx
<ComposerPrimitive.Send />
```

触发发送动作。

`assistant-ui` 会把输入框里的内容整理成一个 message，然后交给 runtime。

---

## 3) `useLangGraphRuntime`

这个 hook 是核心桥梁。
它把 assistant-ui 的“发送消息”动作翻译成 LangGraph 的 API 调用。

它知道：

- 怎么创建 thread
- 怎么读取 thread state
- 怎么接收流式输出
- 怎么处理取消

---

## 4) `unstable_createLangGraphStream`

这里创建了一个 stream 对象。
它负责和 LangGraph 后端保持流式通信。

简单理解就是：

> 前端把消息发过去，后端边算边回，前端边收边更新 UI。

---

## 5) LangGraph 后端处理

后端会：

- 读取 thread state
- 执行 graph
- 运行模型
- 调用工具
- 生成 reasoning / tool-call / text part
- 返回新的消息状态

---

## 6) 前端接收更新

runtime 收到后端更新后，会把它转成 assistant-ui 能理解的状态：

- `thread.isRunning`
- `message.parts`
- `message.status`
- `attachment`
- `interrupts`

---

## 7) UI 自动刷新

因为这些状态是响应式的，所以：

- `Thread` 会重新渲染
- `MessagePrimitive` 会根据 part 类型渲染不同 UI
- `Composer` 会显示发送中 / 停止按钮
- `Reasoning` 会展开或 shimmer
- `ToolGroup` / `ToolFallback` 会展示工具调用
- `MarkdownText` 会渲染最终文本

---

# 一条消息的“内部变身”过程

假设后端返回了这种结构：

```ts
[
  { type: "reasoning", text: "让我想一下..." },
  { type: "tool-call", toolName: "search", argsText: "{...}", status: { type: "running" } },
  { type: "text", text: "根据结果，我建议..." }
]
```

前端会这样渲染：

```txt
assistant message
  ├─ Reasoning
  ├─ ToolFallback / ToolGroup
  └─ MarkdownText
```

---

# 具体渲染流程图

```txt
LangGraph 返回 message.parts
        |
        v
MessagePrimitive.GroupedParts
        |
        +--> reasoning parts  ---> ReasoningRoot / Trigger / Content / Text
        |
        +--> tool-call parts   ---> ToolGroupRoot / ToolFallback
        |
        +--> text parts        ---> MarkdownText
        |
        +--> user messages     ---> UserMessage
```

---

# 发送按钮为什么会变成取消按钮？

因为 runtime 会把线程状态标记为：

```ts
thread.isRunning = true
```

然后 `thread.tsx` 里这段：

```tsx
<AuiIf condition={(s) => !s.thread.isRunning}>
  <ComposerPrimitive.Send />
</AuiIf>

<AuiIf condition={(s) => s.thread.isRunning}>
  <ComposerPrimitive.Cancel />
</AuiIf>
```

就会切换显示。

---

# 取消时发生什么？

如果用户点击停止：

```tsx
<ComposerPrimitive.Cancel />
```

runtime 会告诉 LangGraph 中止当前运行。

之后：

- `thread.isRunning` 变回 `false`
- 工具调用可能变成 `incomplete`
- `ToolFallbackError` 里可能显示 cancelled reason
- UI 刷新成停止状态

---

# 编辑消息后为什么会出现分支？

因为你这套 UI 支持 thread history branch。

当你编辑某条用户消息或者重试 assistant 消息时：

- LangGraph 会形成新的分支
- `BranchPicker` 就可以切换不同分支
- 你在 `thread.tsx` 里看到的上一条 / 下一条按钮就是这个

---

# 你可以把整个过程理解成 4 层

## 第 1 层：数据层

LangGraph 管理 thread / state / tool / reasoning。

## 第 2 层：runtime 层

`useLangGraphRuntime` 把 LangGraph 接到 assistant-ui。

## 第 3 层：组件层

`Thread` / `Message` / `Composer` / `Attachment` / `Reasoning` / `ToolGroup`

## 第 4 层：样式层

`Button` / `Tooltip` / `Collapsible` / Tailwind / CSS variables

---

# 最后给你一个超简化版本

```txt
用户输入
  -> Composer
  -> runtime 发送到 LangGraph
  -> LangGraph 生成消息
  -> runtime 更新状态
  -> Thread 重新渲染
  -> Markdown / Reasoning / Tool / Attachment 分别显示
```

---

如果你愿意，我下一步可以继续给你画一个：

### “assistant-ui 里的 state 结构图”

也就是 `useAuiState` 里那些 `thread.message.attachment` 到底长什么样。这个对你理解 `thread.tsx` 和 `attachment.tsx` 很有帮助。
