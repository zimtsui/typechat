import { Function } from '../../function.ts';
import { Verbatim } from '../../verbatim.ts';

const NOMINAL = Symbol();


export type StructuringChoice<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
> =
    |   StructuringChoice.FCall.Of<fdu>
    |   typeof StructuringChoice.FCall.REQUIRED
    |   typeof StructuringChoice.FCall.ANYONE

    |   StructuringChoice.VRequest.Of<vdu>
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

    export class FCall<fd extends Function.Decl.Proto> {
        protected declare [NOMINAL]: never;
        public constructor(public name: fd['name']) {}
    }
    export namespace FCall {
        export type Of<
            fdu extends Function.Decl.Proto,
        > = fdu extends infer fd extends Function.Decl.Proto ? StructuringChoice.FCall<fd> : never;

        export type From<
            fdm extends Function.Decl.Map.Proto,
        > = StructuringChoice.FCall.Of<Function.Decl.From<fdm>>;

        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }
    export class VRequest<vd extends Verbatim.Decl.Proto> {
        protected declare [NOMINAL]: never;
        public constructor(public name: vd['name']) {}
    }
    export namespace VRequest {
        export type Of<
            vdu extends Verbatim.Decl.Proto,
        > = vdu extends infer vd extends Verbatim.Decl.Proto ? StructuringChoice.VRequest<vd> : never;
        export type From<
            vdm extends Verbatim.Decl.Map.Proto,
        > = StructuringChoice.VRequest.Of<Verbatim.Decl.From<vdm>>;
        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();
    }

    export const NONE = Symbol();
    export const AUTO = Symbol();
}
