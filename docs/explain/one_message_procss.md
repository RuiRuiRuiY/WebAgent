当然，下面我给你画一张 **“用户发送一条消息后，各个 Primitive 如何联动更新”** 的动态图。

---

# 发送消息后的联动流程图

```txt
1. 用户在 ComposerPrimitive.Input 输入内容
        |
        v
2. 点击 ComposerPrimitive.Send
        |
        v
3. ComposerPrimitive.Root 收集输入 + 附件
        |
        v
4. 通过 runtime 把消息发给 LangGraph
        |
        v
5. thread.isRunning = true
        |
        +------------------------------+
        |                              |
        v                              v
6a. Composer 显示 Cancel          6b. Thread 消息区更新
        |                              |
        |                              v
        |                   新的 assistant 消息开始流式返回
        |                              |
        v                              v
7. ThreadPrimitive.Messages     8. MessagePrimitive.Root
        |                              |
        |                              v
        |                   MessagePrimitive.GroupedParts
        |                              |
        |          +-------------------+-------------------+
        |          |                   |                   |
        |          v                   v                   v
        |     ReasoningRoot      ToolGroupRoot       MarkdownText
        |          |                   |                   |
        |          |                   |                   v
        |          |                   |            显示普通文本
        |          |                   |
        |          |                   +--> 工具执行结果/状态更新
        |          |
        |          +--> 显示正在思考 / 可折叠 reasoning
        |
        v
9. LangGraph 返回最终结果
        |
        v
10. thread.isRunning = false
        |
        +------------------------------+
        |                              |
        v                              v
11a. Composer 恢复 Send          11b. ActionBar 显示
```

---

# 按阶段解释

---

## 阶段 1：用户输入

用户在：

```tsx
<ComposerPrimitive.Input />
```

里输入文本。

如果还拖了附件，附件会在：

```tsx
<ComposerPrimitive.Attachments />
```

里显示。

---

## 阶段 2：点击发送

点击：

```tsx
<ComposerPrimitive.Send />
```

后，composer 会把当前文本和附件打包。

---

## 阶段 3：发给 runtime

这一步进入：

```tsx
useLangGraphRuntime
```

然后走到 LangGraph 后端。

---

## 阶段 4：线程进入运行中

这时：

```ts
thread.isRunning = true
```

所以 UI 发生两个变化：

### Composer 区：

- `Send` 按钮隐藏
- `Cancel` 按钮显示

### Thread 区：

- assistant 消息开始流式追加

---

## 阶段 5：assistant 消息开始流式返回

后端可能先返回：

- reasoning
- tool-call
- text

于是：

```txt
MessagePrimitive.GroupedParts
```

开始按类型渲染：

- `reasoning` → `ReasoningRoot`
- `tool-call` → `ToolGroupRoot` / `ToolFallback`
- `text` → `MarkdownText`

---

## 阶段 6：工具调用和 reasoning 可能同时存在

比如：

- reasoning 先展开
- tool call 显示 running 状态
- text 可能晚一点再出现

所以消息内容是“逐步长出来”的。

---

## 阶段 7：最终结果返回

当 LangGraph 完成时：

```ts
thread.isRunning = false
```

这时 UI 再切回：

- `ComposerPrimitive.Send`
- `ActionBar` 恢复显示
- `ToolFallback` / `ToolGroup` 里的 running 状态结束
- reasoning 不再闪烁

---

# 用一条简化链路记忆

```txt
Composer 输入
  -> Send
  -> runtime 发给 LangGraph
  -> thread.isRunning = true
  -> assistant 消息流式返回
  -> MessagePrimitive.GroupedParts 分发到 Reasoning / Tool / Markdown
  -> 完成后 thread.isRunning = false
  -> Composer 回到可发送状态
```

---

# 最后给你一个“状态变化速记表”

```txt
输入中:
  ComposerPrimitive.Input 有值

发送中:
  thread.isRunning = true
  Composer 显示 Cancel

返回 reasoning:
  ReasoningRoot / Trigger / Content 更新

返回 tool-call:
  ToolGroupRoot 或 ToolFallback 更新

返回 text:
  MarkdownText 更新

完成:
  thread.isRunning = false
  Composer 显示 Send
```

---

如果你愿意，我接下来可以继续给你画一张：

### “assistant-ui 中最常见的 useAuiState 读取点地图”

也就是你这些组件里到底分别在读哪些状态。
