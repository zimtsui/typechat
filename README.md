# TypeChat

[![NPM Version](https://img.shields.io/npm/v/@zimtsui/typechat?style=flat-square)](https://www.npmjs.com/package/@zimtsui/typechat)

TypeChat 是一个强类型的 LLM 推理服务商 API 适配器。

## 支持服务商 API 类型

-   OpenAI ChatCompletions
-   OpenAI Responses
-   Google
-   Anthropic

## [配置](./examples/config.ts)
## [对话](./examples/chat.ts)
## [智能体](./examples/agent.ts)
### [XML 逐字频道](./examples/verbatim.ts)

When a LLM outputs structured data in JSON format (e.g., legacy LLM function calling), if there are too many special characters in a string property (e.g., a large LaTeX document, or a complex shell command), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in LLM messages.
