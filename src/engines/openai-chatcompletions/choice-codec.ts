import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import OpenAI from 'openai';
import { StructuringChoice } from '../compatible/structuring-choice.ts';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    choice: StructuringChoice<fdu, vdu>,
): OpenAI.ChatCompletionToolChoiceOption {
    if (choice === StructuringChoice.NONE) return 'none';
    else if (choice === StructuringChoice.REQUIRED) return 'auto';
    else if (choice === StructuringChoice.ANYONE) return 'auto';
    else if (choice === StructuringChoice.AUTO) return 'auto';

    else if (choice === StructuringChoice.FCall.REQUIRED) return 'required';
    else if (choice === StructuringChoice.FCall.ANYONE) return 'required';
    else if (choice instanceof StructuringChoice.FCall)
        return {
            type: 'function',
            function: {
                name: choice.name,
            },
        };

    else if (choice === StructuringChoice.VRequest.REQUIRED) return 'none';
    else if (choice === StructuringChoice.VRequest.ANYONE) return 'none';
    else if (choice instanceof StructuringChoice.VRequest) return 'none';

    else throw new Error();
}

