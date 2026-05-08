import * as Google from '@google/genai';
import { ToolChoice } from '../../tool-choice.ts';


export function encode(
    toolChoice: ToolChoice,
): Google.FunctionCallingConfig {

    if (toolChoice === ToolChoice.NONE) return { mode: Google.FunctionCallingConfigMode.NONE };
    else if (toolChoice === ToolChoice.REQUIRED) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (toolChoice === ToolChoice.ANYONE) return { mode: Google.FunctionCallingConfigMode.ANY };
    else if (toolChoice === ToolChoice.AUTO) return { mode: Google.FunctionCallingConfigMode.AUTO };
    else throw new Error('Invalid tool choice');
}
