import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';

const NOMINAL = Symbol();


export type StructuringChoice<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
> =
    |   StructuringChoice.TCall.FCall.Of<fdu>
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
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = StructuringChoice<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;


    export const REQUIRED = Symbol();
    export const ANYONE = Symbol();

    export namespace TCall {
        export class FCall<fd extends Function.Decl.Proto> {
            protected declare [NOMINAL]: never;
            public constructor(public name: fd['name']) {}
        }
        export namespace FCall {
            export type Of<
                fdu extends Function.Decl.Proto,
            > = fdu extends infer fd extends Function.Decl.Proto ? StructuringChoice.TCall.FCall<fd> : never;

            export type From<
                fdm extends Function.Decl.Map.Proto,
            > = StructuringChoice.TCall.FCall.Of<Function.Decl.From<fdm>>;
        }

        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }

    export namespace VRequest {
        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }

    export const NONE = Symbol();
    export const AUTO = Symbol();
}
