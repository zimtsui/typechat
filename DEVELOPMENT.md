## Architecture Diagram

```mermaid
classDiagram

RoleMessage <|-- GoogleRoleMessage
RoleMessage <|-- OpenAIResponsesRoleMessage
RoleMessage <|-- OpenAIChatCompletionsRoleMessage
RoleMessage <|-- AnthropicRoleMessage

GoogleEngine ..|> Engine
OpenAIResponsesEngine ..|> Engine
OpenAIChatCompletionsEngine ..|> Engine
AnthropicEngine ..|> Engine

GoogleRoleMessage <-- GoogleEngine
OpenAIResponsesRoleMessage <-- OpenAIResponsesEngine
OpenAIChatCompletionsRoleMessage <-- OpenAIChatCompletionsEngine
AnthropicRoleMessage <-- AnthropicEngine
```
