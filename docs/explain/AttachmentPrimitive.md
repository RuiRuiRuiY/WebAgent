可以，下面我给你画一个 **`AttachmentPrimitive` 的结构图**。
这个是“单个附件”层面的基础组件。

---

# `AttachmentPrimitive` 结构图

```txt
AttachmentPrimitive.Root
├── AttachmentPrimitive.Name
├── AttachmentPrimitive.Remove
└── 相关 attachment state / context
```

---

# 1) `AttachmentPrimitive.Root`

这是单个附件的根容器。

### 作用

- 提供当前附件上下文
- 让内部组件知道附件类型、来源、文件、名称等
- 让 `Name`、`Remove` 这些子组件能工作

你在 `AttachmentUI` 里看到的是：

```tsx
<AttachmentPrimitive.Root className="aui-attachment-root ...">
```

---

# 2) `AttachmentPrimitive.Name`

这是附件名称显示组件。

### 作用

- 显示附件文件名
- 常配合 tooltip 或文字说明使用

在你的代码里：

```tsx
<TooltipContent side="top">
  <AttachmentPrimitive.Name />
</TooltipContent>
```

也就是说，当鼠标悬停附件时，会显示附件名字。

---

# 3) `AttachmentPrimitive.Remove`

这是附件删除按钮的行为组件。

### 作用

- 删除当前附件
- 主要用于 composer 里的待发送附件
- 已发送消息里的附件通常不显示删除按钮

你这里是：

```tsx
<AttachmentPrimitive.Remove asChild>
```

配合 `TooltipIconButton` 使用。

---

# 4) 它在你的 `AttachmentUI` 里怎么拼的？

```txt
AttachmentPrimitive.Root
├── 点击预览区域
│   └── AttachmentPreviewDialog
│       └── AttachmentThumb
├── AttachmentPrimitive.Remove   (仅 composer 附件显示)
└── TooltipContent
    └── AttachmentPrimitive.Name
```

---

# 5) 这几个组件各自负责什么？

### `Root`

定义这个附件是谁、属于谁、状态是什么。

### `Name`

显示附件名字。

### `Remove`

删除这个附件。

---

# 6) 它和 `ComposerPrimitive` / `MessagePrimitive` 的关系

```txt
ComposerPrimitive.Attachments
  └── AttachmentPrimitive.Root
       ├── Name
       └── Remove

MessagePrimitive.Attachments
  └── AttachmentPrimitive.Root
       ├── Name
       └── (通常不显示 Remove)
```

---

# 7) 你代码里的关键判断

你在 `AttachmentUI` 里写了：

```tsx
const aui = useAui();
const isComposer = aui.attachment.source !== "message";
```

### 含义

- 如果附件来源不是 message
- 那就说明它是 composer 里的待发送附件
- 所以显示删除按钮

这就是为什么：

```tsx
{isComposer && <AttachmentRemove />}
```

---

# 8) 你可以把它理解成

> `AttachmentPrimitive` 是“单个附件”的行为层，
> 真正的显示样式是你在 `AttachmentUI` 里自己拼的。

---

# 9) 最后给你一个超简化记忆

```txt
AttachmentPrimitive.Root   = 单个附件根节点
AttachmentPrimitive.Name   = 附件名
AttachmentPrimitive.Remove = 删除附件
```

---

如果你愿意，我下一步可以继续帮你把这 4 个图合成一张总图：

- `ThreadPrimitive`
- `MessagePrimitive`
- `ComposerPrimitive`
- `AttachmentPrimitive`

这样你就能一眼看出整个 assistant-ui 的组件关系。
