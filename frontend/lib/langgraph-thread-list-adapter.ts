import { Client } from "@langchain/langgraph-sdk";
import { createAssistantStream } from "assistant-stream";
import type {
  RemoteThreadListAdapter,
  RemoteThreadInitializeResponse,
  RemoteThreadListPageOptions,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "@assistant-ui/core";
import type { ThreadMessage } from "@assistant-ui/core";

export class LangGraphThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private client: Client) {}

  async list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse> {
    const offset = params?.after ? Number(params.after) : 0;
    const result = await this.client.threads.search<Record<string, unknown>>({
      limit: 20,
      offset,
      sortBy: "updated_at",
      sortOrder: "desc",
    });
    return {
      threads: result.map((t) => ({
        remoteId: t.thread_id,
        externalId: t.thread_id,
        status: normalizeStatus(t.metadata?.status),
        title: t.metadata?.title as string | undefined,
      })),
      nextCursor: result.length === 20 ? String(offset + 20) : undefined,
    };
  }

  async initialize(localId: string): Promise<RemoteThreadInitializeResponse> {
    const thread = await this.client.threads.create({
      metadata: { title: "新会话" },
    });
    return { remoteId: thread.thread_id, externalId: thread.thread_id };
  }

  async rename(remoteId: string, newTitle: string): Promise<void> {
    const prev = await this.client.threads.get(remoteId);
    await this.client.threads.update(remoteId, {
      metadata: { ...prev.metadata, title: newTitle },
    });
  }

  async delete(remoteId: string): Promise<void> {
    await this.client.threads.delete(remoteId);
  }

  async fetch(remoteId: string): Promise<RemoteThreadMetadata> {
    const thread = await this.client.threads.get(remoteId);
    return {
      remoteId: thread.thread_id,
      status: normalizeStatus(thread.metadata?.status),
      title: thread.metadata?.title as string | undefined,
    };
  }

  async generateTitle(_remoteId: string, messages: readonly ThreadMessage[]): Promise<ReturnType<typeof createAssistantStream>> {
    return createAssistantStream(async (controller) => {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const text = firstUser.content
          .filter((c): c is { type: "text"; text: string } => c.type === "text")
          .map((c) => c.text)
          .join(" ");
        controller.appendText(text.slice(0, 50) + (text.length > 50 ? "..." : ""));
      } else {
        controller.appendText("新会话");
      }
    }) as unknown as ReturnType<typeof createAssistantStream>;
  }

  async archive(remoteId: string): Promise<void> {
    const prev = await this.client.threads.get(remoteId);
    await this.client.threads.update(remoteId, {
      metadata: { ...prev.metadata, status: "archived" },
    });
  }

  async unarchive(remoteId: string): Promise<void> {
    const prev = await this.client.threads.get(remoteId);
    await this.client.threads.update(remoteId, {
      metadata: { ...prev.metadata, status: "regular" },
    });
  }
}

function normalizeStatus(raw: unknown): "regular" | "archived" {
  return raw === "regular" || raw === "archived" ? raw : "regular";
}
