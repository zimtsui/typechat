import { ToolChoice } from '../../tool-choice.ts';
import Anthropic from '@anthropic-ai/sdk';


export function encode(
    toolChoice: ToolChoice,
    parallelToolCall?: boolean,
): Anthropic.ToolChoice {
    const disable_parallel_tool_use: boolean | undefined = typeof parallelToolCall === 'boolean' ? !parallelToolCall : undefined;

    if (toolChoice === ToolChoice.NONE) return { type: 'none' };
    else if (toolChoice === ToolChoice.REQUIRED) return { type: 'any', disable_parallel_tool_use };
    else if (toolChoice === ToolChoice.ANYONE) return { type: 'any', disable_parallel_tool_use };
    else if (toolChoice === ToolChoice.AUTO) return { type: 'auto', disable_parallel_tool_use };
    else throw new Error('Invalid tool choice');
}
