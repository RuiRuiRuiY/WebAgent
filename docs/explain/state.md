好的，下面我给你画一个 **assistant-ui 内部状态结构图**，重点是你在这些文件里经常看到的：

- `useAuiState((s) => ...)`
- `s.thread...`
- `s.message...`
- `s.attachment...`

它们到底是什么层级。

---

# assistant-ui 状态结构图

```txt
AuiState
├── thread
│   ├── id
│   ├── isEmpty
│   ├── isRunning
│   ├── messages[]
│   ├── suggestions[]
│   └── ...
│
├── message
│   ├── id
│   ├── role
│   ├── status
│   ├── isCopied
│   ├── composer
│   │   ├── isEditing
│   │   ├── ...
│   ├── parts[]
│   └── ...
│
└── attachment
    ├── type
    ├── source
    ├── file
    ├── content
    ├── name
    ├── ...
```

---

# 1) `thread` 层

这是“整个对话线程”的状态。

你在 `thread.tsx` 里经常看到：

```tsx
s.thread.isEmpty
s.thread.isRunning
```

---

## 常见字段含义

### `isEmpty`

线程里还没有消息。

所以会显示欢迎页：

```tsx
<AuiIf condition={(s) => s.thread.isEmpty}>
```

---

### `isRunning`

当前 assistant 正在生成回答。

所以会切换按钮：

- `Send`
- `Cancel`

---

### `suggestions`

欢迎页下面的建议问题列表。

```tsx
<ThreadPrimitive.Suggestions>
```

---

### `messages`

当前线程里的消息数组。

`ThreadPrimitive.Messages` 就是遍历这个。

---

# 2) `message` 层

这是“当前正在渲染的一条消息”的上下文状态。

比如在：

```tsx
<ThreadPrimitive.Messages>
  {() => <ThreadMessage />}
</ThreadPrimitive.Messages>
```

里面，每次都会进入一条消息的上下文。

---

## 常见字段

### `role`

当前消息角色：

- `user`
- `assistant`
- 可能还有其他角色（取决于 runtime）

你在 `ThreadMessage` 里就是根据它分流：

```tsx
if (role === "user") return <UserMessage />;
return <AssistantMessage />;
```

---

### `status`

消息状态，比如：

- `running`
- `complete`
- `incomplete`
- `requires-action`

在 tool / reasoning / assistant 消息里很重要。

---

### `isCopied`

这条消息是否刚刚被复制过。

所以复制按钮能从：

- Copy 图标
- 变成 Check 图标

---

### `parts`

消息由哪些 part 组成。

可能有：

- `text`
- `reasoning`
- `tool-call`
- `image`
- 其他附件/结构化 part

`MessagePrimitive.GroupedParts` 就是在处理这个。

---

### `composer.isEditing`

当前用户消息是否正在编辑。

```tsx
const isEditing = useAuiState((s) => s.message.composer.isEditing);
```

如果是，就显示 `EditComposer`。

---

# 3) `attachment` 层

这是“当前附件”的上下文状态。

在 `attachment.tsx` 里你看到了：

```tsx
s.attachment.type
s.attachment.source
s.attachment.file
s.attachment.content
```

---

## 常见字段含义

### `type`

附件类型，例如：

- `image`
- `document`
- `file`

所以你能决定显示什么图标/预览。

---

### `source`

附件来源：

- `message`：已经在消息里
- `composer`：还在输入框里，未发送

你代码里有：

```tsx
const isComposer = aui.attachment.source !== "message";
```

意思是：如果不是 message 里的附件，就说明是 composer 附件，可以删。

---

### `file`

本地上传的 `File` 对象。

如果有这个，就可以用 `URL.createObjectURL(file)` 做本地预览。

---

### `content`

已经解析好的附件内容，比如图片 URL。

你在 `useAttachmentSrc()` 里就是从这里取图片地址：

```tsx
s.attachment.content?.filter((c) => c.type === "image")[0]?.image;
```

---

# 4) 三层关系怎么理解？

你可以这样记：

## `thread`

管“整个聊天会话”

## `message`

管“当前这条消息”

## `attachment`

管“当前这个附件”

---

# 5) 它们在组件树里怎么对应？

```txt
AssistantRuntimeProvider
  └── Thread
       ├── ThreadPrimitive.Viewport
       │    └── ThreadPrimitive.Messages
       │         └── MessagePrimitive.Root
       │              ├── MessagePrimitive.Parts
       │              └── MessagePrimitive.Attachments
       │
       └── ComposerPrimitive.Root
            └── ComposerPrimitive.Attachments
                 └── AttachmentPrimitive.Root
```

---

# 6) 你代码里最常见的状态判断

---

## `thread.isEmpty`

决定是否显示欢迎页

```tsx
<AuiIf condition={(s) => s.thread.isEmpty}>
  <ThreadWelcome />
</AuiIf>
```

---

## `thread.isRunning`

决定发送按钮还是取消按钮

```tsx
<AuiIf condition={(s) => !s.thread.isRunning}>
  <ComposerPrimitive.Send />
</AuiIf>

<AuiIf condition={(s) => s.thread.isRunning}>
  <ComposerPrimitive.Cancel />
</AuiIf>
```

---

## `message.role`

决定渲染用户消息还是助手消息

---

## `message.composer.isEditing`

决定是不是编辑状态

---

## `attachment.type`

决定显示图片预览、文件图标还是别的 UI

---

# 7) 一个具体例子

假设当前状态是：

```ts
{
  thread: {
    isEmpty: false,
    isRunning: true
  },
  message: {
    role: "assistant",
    status: { type: "running" },
    parts: [
      { type: "reasoning" },
      { type: "tool-call" },
      { type: "text" }
    ],
    isCopied: false
  },
  attachment: {
    type: "image",
    source: "composer",
    file: File(...)
  }
}
```

那么 UI 会表现成：

- 不显示欢迎页
- 发送按钮变取消按钮
- assistant 消息里显示：
  - reasoning
  - tool group / fallback
  - markdown 文本
- composer 里显示一个图片附件缩略图
- 附件右上角有删除按钮

---

# 8) 最后给你一句总记忆法

你可以把 assistant-ui 的状态想成三层：

```txt
thread  = 整个对话
message = 当前消息
attachment = 当前附件
```

而 `useAuiState` 就是在这些层级里“取你想要的那一小块状态”。

---

如果你愿意，我下一步可以继续帮你画一个：

### `ThreadPrimitive` / `MessagePrimitive` / `ComposerPrimitive` 的组件树结构图

这样你就能把“状态结构”和“组件结构”对应起来。
