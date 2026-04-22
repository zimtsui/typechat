## Architecture Diagram

```mermaid
classDiagram

Engine <|.. CompatibleEngine

Engine <|.. OpenAIResponsesNativeEngine
OpenAIResponsesNativeEngine o--> OpenAIResponsesNativeHelpers
OpenAIResponsesNativeHelpers o--> OpenAIResponsesHelpers

CompatibleEngine <|.. OpenAICompatibleEngine
OpenAICompatibleEngine o--> OpenAIResponsesCompatibleHelpers
OpenAIResponsesCompatibleHelpers o--> OpenAIResponsesHelpers

```
