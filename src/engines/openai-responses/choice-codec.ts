import { StructuringChoice } from '../../engine/structuring-choice.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import type { OpenAI } from 'openai';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    structuringChoice: StructuringChoice<fdu, vdu>,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
    if (structuringChoice === StructuringChoice.NONE) return 'none';
    else if (structuringChoice === StructuringChoice.REQUIRED) return 'auto';
    else if (structuringChoice === StructuringChoice.ANYONE) return 'auto';
    else if (structuringChoice === StructuringChoice.AUTO) return 'auto';

    else if (structuringChoice === StructuringChoice.TCall.REQUIRED) return 'required';
    else if (structuringChoice === StructuringChoice.TCall.ANYONE) return 'required';
    else if (structuringChoice instanceof StructuringChoice.TCall.FCall)
        return {
            type: 'allowed_tools',
            mode: 'required',
            tools: [{ type: 'function', name: structuringChoice.name }] satisfies OpenAI.Responses.ToolChoiceFunction[],
        };

    else if (structuringChoice === StructuringChoice.VRequest.REQUIRED) return 'none';
    else if (structuringChoice === StructuringChoice.VRequest.ANYONE) return 'none';

    else throw new Error();
}
