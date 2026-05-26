# Thread List Rename Feature

## Summary

Add inline rename functionality to the ThreadList "More" dropdown menu, alongside existing Archive and Delete actions.

## Motivation

Users can currently archive or delete threads from the sidebar, but cannot rename them. The backend (`PATCH /threads/{id}`) and adapter (`LangGraphThreadListAdapter.rename`) already support this — only the UI is missing.

## Design

### Component Changes

All changes are in `frontend/components/thread-list.tsx` (~30 lines added).

#### `ThreadListPrimitive.Items` — Use render function with state

Switch from the no-argument render function to one that receives `threadListItem: ThreadListItemState`:

```tsx
<ThreadListPrimitive.Items>
  {({ threadListItem }) => <ThreadListItem state={threadListItem} />}
</ThreadListPrimitive.Items>
```

This follows the official assistant-ui pattern for accessing thread state without deprecated hooks.

#### `ThreadListItem` — New `state` prop + inline editing

- Accepts `state: ThreadListItemState` as a prop
- Displays `state.title` directly (replaces `ThreadListItemPrimitive.Title`)
- Manages `isEditing` local state (`useState(false)`)
- Normal mode: shows `ThreadListItemPrimitive.Trigger` with `state.title`
- Edit mode: shows `<input defaultValue={state.title} autoFocus />` instead of the trigger/title
- Enter / blur → saves via `useAuiState((s) => s.threadListItem).rename(newTitle)` → exits edit mode
- Escape → cancels (restores original title) → exits edit mode

#### `ThreadListItemMore` — New `onRename` prop

- Adds "Rename" menu item with `PencilIcon` from `lucide-react`
- Placed between Archive and Delete
- Calls `onRename()` on click to signal the parent to enter edit mode

### Data Flow

```
User clicks Rename → ThreadListItemMore.onRename() → ThreadListItem.isEditing = true
→ Input appears with current title → User types new name → Enter/blur
→ useAuiState((s) => s.threadListItem).rename(newTitle)
→ LangGraphThreadListAdapter.rename(remoteId, newTitle)
→ PATCH /threads/{id} with metadata.title
```

### Unchanged

- Archive, Delete, and other existing functionality
- Backend (`backend/`) and adapter (`langgraph-thread-list-adapter.ts`)
- Styling follows existing menu item conventions

## File Changes

| File | Change |
|------|--------|
| `frontend/components/thread-list.tsx` | Add inline rename UI, update Items render function, add PencilIcon |

## Testing

- Rename via keyboard (Enter to save, Escape to cancel)
- Rename via blur (clicking outside the input)
- Rename with empty title (should be handled gracefully)
- Verify the new title persists after page reload
