

export type ToolChoice =
    |   typeof ToolChoice.NONE
    |   typeof ToolChoice.AUTO
    |   typeof ToolChoice.REQUIRED
    |   typeof ToolChoice.ANYONE
;

export namespace ToolChoice {
    export const REQUIRED = Symbol();
    export const ANYONE = Symbol();
    export const NONE = Symbol();
    export const AUTO = Symbol();
}
