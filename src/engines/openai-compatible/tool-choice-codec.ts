import { ToolChoice } from '../../tool-choice.ts';
import type { OpenAI } from 'openai';


export function encode(
    toolChoice: ToolChoice,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
    if (toolChoice === ToolChoice.NONE) return 'none';
    else if (toolChoice === ToolChoice.REQUIRED) return 'auto';
    else if (toolChoice === ToolChoice.ANYONE) return 'auto';
    else if (toolChoice === ToolChoice.AUTO) return 'auto';
    else throw new Error();
}
