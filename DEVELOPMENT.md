## Architecture Diagram

```mermaid
classDiagram

Engine <|-- NativeEngine

NativeRoleMessage --|> RoleMessage

NativeEngine --> NativeRoleMessage
```
