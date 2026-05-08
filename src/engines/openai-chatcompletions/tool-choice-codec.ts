import OpenAI from 'openai';
import { ToolChoice } from '../../tool-choice.ts';


export function encode(
    toolChoice: ToolChoice,
): OpenAI.ChatCompletionToolChoiceOption {
    if (toolChoice === ToolChoice.NONE) return 'none';
    else if (toolChoice === ToolChoice.REQUIRED) return 'required';
    else if (toolChoice === ToolChoice.ANYONE) return 'required';
    else if (toolChoice === ToolChoice.AUTO) return 'auto';
    else throw new Error();
}
