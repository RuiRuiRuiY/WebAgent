# Thread List Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline rename functionality to ThreadList's "More" dropdown menu.

**Architecture:** Single-file change to `frontend/components/thread-list.tsx`. The `ThreadListPrimitive.Items` render function receives `threadListItem: ThreadListItemState` for title display; rename is performed via `useAuiState((s) => s.threadListItem).rename(newTitle)`. No backend or adapter changes needed.

**Tech Stack:** Next.js 16, React 19, @assistant-ui/react ^0.14.8, lucide-react

---

### Task 1: Add rename UI to thread-list.tsx

**Files:**
- Modify: `frontend/components/thread-list.tsx`

- [ ] **Step 1: Update imports**

Add `PencilIcon` to lucide-react imports, add `useAuiState` from `@assistant-ui/store`, add `useState` and `useRef` from React:

```tsx
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/store";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { type FC, useRef, useState } from "react";
```

- [ ] **Step 2: Update `ThreadListPrimitive.Items` render function**

Change from no-argument render function to one that receives `threadListItem` state:

```tsx
<AuiIf condition={(s) => !s.threads.isLoading}>
  <ThreadListPrimitive.Items>
    {({ threadListItem }) => <ThreadListItem state={threadListItem} />}
  </ThreadListPrimitive.Items>
</AuiIf>
```

- [ ] **Step 3: Update `ThreadListItem` component**

Accept `state` prop, manage `isEditing` state, render input in edit mode:

```tsx
const ThreadListItem: FC<{ state: ThreadListItemState }> = ({ state }) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartRename = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const newTitle = inputRef.current?.value.trim();
    if (newTitle && newTitle !== state.title) {
      useAuiState((s) => s.threadListItem).rename(newTitle);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex h-9 items-center rounded-lg px-3">
        <input
          ref={inputRef}
          defaultValue={state.title}
          autoFocus
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-7 w-full rounded border bg-background px-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
    );
  }

  return (
    <ThreadListItemPrimitive.Root className="group flex h-9 items-center gap-2 rounded-lg transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none data-active:bg-muted">
      <ThreadListItemPrimitive.Trigger className="flex h-full min-w-0 flex-1 items-center px-3 text-start text-sm">
        <span className="min-w-0 flex-1 truncate">
          {state.title || "New Chat"}
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore onRename={handleStartRename} />
    </ThreadListItemPrimitive.Root>
  );
};
```

- [ ] **Step 4: Update `ThreadListItemMore` component**

Add `onRename` prop and Rename menu item between Archive and Delete:

```tsx
const ThreadListItemMore: FC<{ onRename: () => void }> = ({ onRename }) => {
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
        <ThreadListItemMorePrimitive.Item
          onClick={onRename}
          className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <PencilIcon className="size-4" />
          Rename
        </ThreadListItemMorePrimitive.Item>
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

- [ ] **Step 5: Verify build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/components/thread-list.tsx
git commit -m "feat: add inline rename to thread list"
```
