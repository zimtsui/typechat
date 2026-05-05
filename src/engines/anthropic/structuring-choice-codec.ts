import { StructuringChoice } from '../../structuring-choice.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import Anthropic from '@anthropic-ai/sdk';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    structuringChoice: StructuringChoice,
    parallelToolCall?: boolean,
): Anthropic.ToolChoice {
    const disable_parallel_tool_use: boolean | undefined = typeof parallelToolCall === 'boolean' ? !parallelToolCall : undefined;

    if (structuringChoice === StructuringChoice.NONE) return { type: 'none' };
    else if (structuringChoice === StructuringChoice.REQUIRED) return { type: 'auto', disable_parallel_tool_use };
    else if (structuringChoice === StructuringChoice.ANYONE) return { type: 'auto', disable_parallel_tool_use };
    else if (structuringChoice === StructuringChoice.AUTO) return { type: 'auto', disable_parallel_tool_use };

    else if (structuringChoice === StructuringChoice.TCall.REQUIRED) return { type: 'any', disable_parallel_tool_use };
    else if (structuringChoice === StructuringChoice.TCall.ANYONE) return { type: 'any', disable_parallel_tool_use };

    else if (structuringChoice === StructuringChoice.VRequest.REQUIRED) return { type: 'none' };
    else if (structuringChoice === StructuringChoice.VRequest.ANYONE) return { type: 'none' };

    else throw new Error('Invalid structuring choice');
}
