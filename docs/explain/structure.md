好，下面我把这四个 primitive 合成一张**总结构图**，你可以把它理解成 assistant-ui 的“聊天页面骨架”。

---

# assistant-ui 总结构图

```txt
AssistantRuntimeProvider
└── Thread
    └── ThreadPrimitive.Root
        └── ThreadPrimitive.Viewport
            ├── ThreadWelcome
            ├── ThreadPrimitive.Suggestions
            ├── ThreadPrimitive.Messages
            │   └── MessagePrimitive.Root
            │       ├── MessagePrimitive.Attachments
            │       │   └── AttachmentPrimitive.Root
            │       │       ├── AttachmentPrimitive.Name
            │       │       └── AttachmentPrimitive.Remove
            │       ├── MessagePrimitive.Parts
            │       ├── MessagePrimitive.GroupedParts
            │       │   ├── ReasoningRoot
            │       │   │   ├── ReasoningTrigger
            │       │   │   ├── ReasoningContent
            │       │   │   └── ReasoningText
            │       │   ├── ToolGroupRoot
            │       │   │   ├── ToolGroupTrigger
            │       │   │   └── ToolGroupContent
            │       │   └── ToolFallbackRoot
            │       │       ├── ToolFallbackTrigger
            │       │       ├── ToolFallbackContent
            │       │       ├── ToolFallbackArgs
            │       │       ├── ToolFallbackResult
            │       │       └── ToolFallbackError
            │       ├── MessagePrimitive.Error
            │       └── ActionBar / BranchPicker
            │
            └── ThreadPrimitive.ViewportFooter
                ├── ThreadPrimitive.ScrollToBottom
                └── Composer
                    └── ComposerPrimitive.Root
                        └── ComposerPrimitive.AttachmentDropzone
                            └── composer shell
                                ├── ComposerPrimitive.Attachments
                                │   └── AttachmentPrimitive.Root
                                │       ├── AttachmentPrimitive.Name
                                │       └── AttachmentPrimitive.Remove
                                ├── ComposerPrimitive.Input
                                └── ComposerAction
                                    ├── ComposerPrimitive.AddAttachment
                                    ├── ComposerPrimitive.Send
                                    └── ComposerPrimitive.Cancel
```

---

# 这张图怎么读

---

## 1) 最外层：`AssistantRuntimeProvider`

它提供 runtime，上下文从这里开始。

没有它，后面的 `ThreadPrimitive`、`MessagePrimitive`、`ComposerPrimitive` 都不知道数据从哪来。

---

## 2) 第二层：`Thread`

你的 `Thread` 组件负责把整个聊天页面拼起来。

里面最核心的是：

- 欢迎页
- 消息列表
- 底部 composer

---

## 3) 消息层：`MessagePrimitive.Root`

每条消息都走这个结构。

### 用户消息

- `MessagePrimitive.Attachments`
- `MessagePrimitive.Parts`
- `UserActionBar`
- `BranchPicker`

### 助手消息

- `MessagePrimitive.GroupedParts`
- `MessagePrimitive.Error`
- `AssistantActionBar`
- `BranchPicker`

---

## 4) 组件分支层：`Reasoning` / `ToolGroup` / `ToolFallback`

这是 assistant 消息里最有特色的部分：

- `reasoning` → 思考过程
- `tool-call` → 工具调用
- `text` → Markdown 文本

---

## 5) 附件层：`AttachmentPrimitive.Root`

附件既可以在消息里，也可以在 composer 里出现。

但它们本质上都是同一个“附件实体”。

---

## 6) 输入层：`ComposerPrimitive.Root`

输入框区域负责：

- 输入文本
- 加附件
- 发送消息
- 取消生成

---

# 你可以把它压缩成 4 句话

```txt
Thread 管整个聊天页面
Message 管单条消息
Composer 管输入框
Attachment 管单个附件
```

---

# 再给你一个“从外到内”的简版

```txt
AssistantRuntimeProvider
  -> Thread
    -> ThreadPrimitive
      -> MessagePrimitive
        -> Reasoning / ToolGroup / ToolFallback / MarkdownText / AttachmentPrimitive
      -> ComposerPrimitive
        -> AttachmentPrimitive
```

---

# 最后一句总结

这套架构的核心思想就是：

> 用 `Runtime` 提供数据和动作，用一组 `Primitive` 负责布局和交互，再用你自己的 UI 组件把它们拼成完整聊天界面。

---

如果你愿意，我下一步可以继续给你画一张：

### “一次用户发送消息后，各个 Primitive 如何联动更新”的动态图

这个会把 `thread.isRunning`、`message.parts`、`composer`、`attachments` 的变化串起来。
