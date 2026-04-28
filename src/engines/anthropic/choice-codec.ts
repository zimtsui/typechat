import { StructuringChoice } from '../compatible/structuring-choice.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import Anthropic from '@anthropic-ai/sdk';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    choice: StructuringChoice<fdu, vdu>,
    parallelToolCall?: boolean,
): Anthropic.ToolChoice {
    const disable_parallel_tool_use: boolean | undefined = typeof parallelToolCall === 'boolean' ? !parallelToolCall : undefined;

    if (choice === StructuringChoice.NONE) return { type: 'none' };
    else if (choice === StructuringChoice.REQUIRED) return { type: 'auto', disable_parallel_tool_use };
    else if (choice === StructuringChoice.ANYONE) return { type: 'auto', disable_parallel_tool_use };
    else if (choice === StructuringChoice.AUTO) return { type: 'auto', disable_parallel_tool_use };

    else if (choice === StructuringChoice.FCall.REQUIRED) return { type: 'any', disable_parallel_tool_use };
    else if (choice === StructuringChoice.FCall.ANYONE) return { type: 'any', disable_parallel_tool_use };
    else if (choice instanceof StructuringChoice.FCall)
        return { type: 'tool', name: choice.name, disable_parallel_tool_use };

    else if (choice === StructuringChoice.VRequest.REQUIRED) return { type: 'none' };
    else if (choice === StructuringChoice.VRequest.ANYONE) return { type: 'none' };
    else if (choice instanceof StructuringChoice.VRequest) return { type: 'none' };

    else throw new Error('Invalid structuring choice');
}

