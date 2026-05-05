

export type StructuringChoice =
    |   typeof StructuringChoice.TCall.REQUIRED
    |   typeof StructuringChoice.TCall.ANYONE

    |   typeof StructuringChoice.VRequest.REQUIRED
    |   typeof StructuringChoice.VRequest.ANYONE

    |   typeof StructuringChoice.NONE
    |   typeof StructuringChoice.AUTO
    |   typeof StructuringChoice.REQUIRED
    |   typeof StructuringChoice.ANYONE
;

export namespace StructuringChoice {

    export namespace TCall {

        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }

    export namespace VRequest {
        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }

    export const REQUIRED = Symbol();
    export const ANYONE = Symbol();
    export const NONE = Symbol();
    export const AUTO = Symbol();
}
