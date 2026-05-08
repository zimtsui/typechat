import * as Google from '@google/genai';
import { StructuringChoice } from '../../structuring-choice.ts';


export function encode(
    structuringChoice: StructuringChoice,
): Google.FunctionCallingConfig {

    if (structuringChoice === StructuringChoice.NONE) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (structuringChoice === StructuringChoice.REQUIRED) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (structuringChoice === StructuringChoice.ANYONE) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (structuringChoice === StructuringChoice.AUTO) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else throw new Error('Invalid structuring choice');
}
