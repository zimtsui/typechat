import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as Google from '@google/genai';
import { StructuringChoice } from '../../engine/structuring-choice.ts';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    structuringChoice: StructuringChoice<fdu, vdu>,
): Google.FunctionCallingConfig {

    if (structuringChoice === StructuringChoice.NONE) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (structuringChoice === StructuringChoice.REQUIRED) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else if (structuringChoice === StructuringChoice.ANYONE) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else if (structuringChoice === StructuringChoice.AUTO) return { mode: Google.FunctionCallingConfigMode.AUTO };

    else if (structuringChoice === StructuringChoice.TCall.REQUIRED) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (structuringChoice === StructuringChoice.TCall.ANYONE) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (structuringChoice instanceof StructuringChoice.TCall.FCall)
        return { mode: Google.FunctionCallingConfigMode.ANY, allowedFunctionNames: [structuringChoice.name] };

    else if (structuringChoice === StructuringChoice.VRequest.REQUIRED) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (structuringChoice === StructuringChoice.VRequest.ANYONE) return { mode: Google.FunctionCallingConfigMode.NONE };

    else throw new Error('Invalid structuring choice');
}
