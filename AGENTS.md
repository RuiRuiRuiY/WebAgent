<!-- BEGIN:assistant-ui-rules -->

# assistant-ui指南

This project uses assistant-ui for chat interfaces.

**必须**遵守的规则 [llms-full.txt](./docs/assistant-ui/llms-full.txt)

Key patterns:

- Use AssistantRuntimeProvider at the app root
- Thread component for full chat interface
- AssistantModal for floating chat widget
- useChatRuntime hook with AI SDK transport

<!-- END:assistant-ui-rules -->



<!-- BEGIN:LangChain-rules -->

# LangChain指南

在写任何关于LangChain生态（包括：LangChain、LangGraph、DeepAgents、LangSmith）的代码之前，**必须**遵守的规则 [llm.txt](./docs/langchain/llms.txt)

<!-- END:LangChain-rules -->
