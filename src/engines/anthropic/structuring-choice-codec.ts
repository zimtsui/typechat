import { StructuringChoice } from '../../structuring-choice.ts';
import Anthropic from '@anthropic-ai/sdk';


export function encode(
    structuringChoice: StructuringChoice,
    parallelToolCall?: boolean,
): Anthropic.ToolChoice {
    const disable_parallel_tool_use: boolean | undefined = typeof parallelToolCall === 'boolean' ? !parallelToolCall : undefined;

    if (structuringChoice === StructuringChoice.NONE) return { type: 'none' };
    else if (structuringChoice === StructuringChoice.REQUIRED) return { type: 'any', disable_parallel_tool_use };
    else if (structuringChoice === StructuringChoice.ANYONE) return { type: 'any', disable_parallel_tool_use };
    else if (structuringChoice === StructuringChoice.AUTO) return { type: 'auto', disable_parallel_tool_use };
    else throw new Error('Invalid structuring choice');
}
