import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as Google from '@google/genai';
import { StructuringChoice } from './structuring-choice.ts';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    choice: StructuringChoice<fdu, vdu>,
): Google.FunctionCallingConfig {

    if (choice === StructuringChoice.NONE) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (choice === StructuringChoice.REQUIRED) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else if (choice === StructuringChoice.ANYONE) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else if (choice === StructuringChoice.AUTO) return { mode: Google.FunctionCallingConfigMode.AUTO };

    else if (choice === StructuringChoice.FCall.REQUIRED) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (choice === StructuringChoice.FCall.ANYONE) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (choice instanceof StructuringChoice.FCall)
        return { mode: Google.FunctionCallingConfigMode.ANY, allowedFunctionNames: [choice.name] };

    else if (choice === StructuringChoice.VRequest.REQUIRED) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (choice === StructuringChoice.VRequest.ANYONE) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (choice instanceof StructuringChoice.VRequest) return { mode: Google.FunctionCallingConfigMode.NONE };

    else throw new Error('Invalid structuring choice');
}
