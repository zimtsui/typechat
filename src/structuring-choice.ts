

export type StructuringChoice =
    |   typeof StructuringChoice.NONE
    |   typeof StructuringChoice.AUTO
    |   typeof StructuringChoice.REQUIRED
    |   typeof StructuringChoice.ANYONE
;

export namespace StructuringChoice {
    export const REQUIRED = Symbol();
    export const ANYONE = Symbol();
    export const NONE = Symbol();
    export const AUTO = Symbol();
}
