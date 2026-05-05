import { StructuringChoice } from '../../structuring-choice.ts';
import type { OpenAI } from 'openai';


export function encode(
    structuringChoice: StructuringChoice,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
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
