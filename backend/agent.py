import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState

load_dotenv()

# 初始化模型
model = ChatOpenAI(
    model="qwen-turbo",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=3,
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url=os.getenv("DASHSCOPE_BASE_URL"),
    # organization="...",
    # other params...
)

# 定义调用模型的节点函数
def call_model(state: MessagesState):
    response = model.invoke(state["messages"])
    # 返回新的消息，LangGraph 会自动将其追加到现有消息列表中
    return {"messages": [response]}

# 构建状态图
graph = StateGraph(MessagesState)   # MessagesState 包含 messages 字段，并使用 add_messages 作为 reducer
graph.add_node("agent", call_model)
graph.add_edge("__start__", "agent")
graph.add_edge("agent", "__end__")

# 编译图
app = graph.compile()