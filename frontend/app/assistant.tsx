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
        messages?: LangChainMessage[];
      }>(threadId);
      return {
        messages: state.values?.messages ?? [],
        interrupts: state.tasks?.[0]?.interrupts,
      };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-dvh w-full">
        <aside className="w-60 shrink-0 border-r">
          <ThreadList />
        </aside>
        <main className="min-w-0 flex-1">
          <Thread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
