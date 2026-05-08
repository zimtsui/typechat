import { StructuringChoice } from '../../structuring-choice.ts';
import type { OpenAI } from 'openai';


export function encode(
    structuringChoice: StructuringChoice,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
    if (structuringChoice === StructuringChoice.NONE) return 'none';
    else if (structuringChoice === StructuringChoice.REQUIRED) return 'required';
    else if (structuringChoice === StructuringChoice.ANYONE) return 'required';
    else if (structuringChoice === StructuringChoice.AUTO) return 'auto';
    else throw new Error();
}
