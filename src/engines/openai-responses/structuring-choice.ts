import { StructuringChoice as CompatibleStructuringChoice } from '../compatible/structuring-choice.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';


export type OpenAIResponsesStructuringChoice<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
> =
    |   OpenAIResponsesStructuringChoice.TCall.FCall.Of<fdu>
    |   typeof OpenAIResponsesStructuringChoice.TCall.REQUIRED
    |   typeof OpenAIResponsesStructuringChoice.TCall.ANYONE

    |   OpenAIResponsesStructuringChoice.VRequest.Of<vdu>
    |   typeof OpenAIResponsesStructuringChoice.VRequest.REQUIRED
    |   typeof OpenAIResponsesStructuringChoice.VRequest.ANYONE

    |   typeof OpenAIResponsesStructuringChoice.NONE
    |   typeof OpenAIResponsesStructuringChoice.AUTO
    |   typeof OpenAIResponsesStructuringChoice.REQUIRED
    |   typeof OpenAIResponsesStructuringChoice.ANYONE
;

export namespace OpenAIResponsesStructuringChoice {
    export type From<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = OpenAIResponsesStructuringChoice<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;

    export import REQUIRED = CompatibleStructuringChoice.REQUIRED;
    export import ANYONE = CompatibleStructuringChoice.ANYONE;

    export namespace TCall {
        export const REQUIRED = Symbol();
        export const ANYONE = Symbol();

        export import FCall = CompatibleStructuringChoice.FCall;
    }

    export import VRequest = CompatibleStructuringChoice.VRequest;
    export import NONE = CompatibleStructuringChoice.NONE;
    export import AUTO = CompatibleStructuringChoice.AUTO;
}

