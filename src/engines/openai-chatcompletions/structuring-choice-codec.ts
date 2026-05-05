import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import OpenAI from 'openai';
import { StructuringChoice } from '../../structuring-choice.ts';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    structuringChoice: StructuringChoice,
): OpenAI.ChatCompletionToolChoiceOption {
    if (structuringChoice === StructuringChoice.NONE) return 'none';
    else if (structuringChoice === StructuringChoice.REQUIRED) return 'auto';
    else if (structuringChoice === StructuringChoice.ANYONE) return 'auto';
    else if (structuringChoice === StructuringChoice.AUTO) return 'auto';

    else if (structuringChoice === StructuringChoice.TCall.REQUIRED) return 'required';
    else if (structuringChoice === StructuringChoice.TCall.ANYONE) return 'required';

    else if (structuringChoice === StructuringChoice.VRequest.REQUIRED) return 'none';
    else if (structuringChoice === StructuringChoice.VRequest.ANYONE) return 'none';

    else throw new Error();
}
