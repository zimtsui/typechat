import OpenAI from 'openai';
import { StructuringChoice } from '../../structuring-choice.ts';


export function encode(
    structuringChoice: StructuringChoice,
): OpenAI.ChatCompletionToolChoiceOption {
    if (structuringChoice === StructuringChoice.NONE) return 'none';
    else if (structuringChoice === StructuringChoice.REQUIRED) return 'required';
    else if (structuringChoice === StructuringChoice.ANYONE) return 'required';
    else if (structuringChoice === StructuringChoice.AUTO) return 'auto';
    else throw new Error();
}
