import { Structuring } from './structuring.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import type { OpenAI } from 'openai';



export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    structuringChoice: Structuring.Choice<fdu, vdu>,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
    if (structuringChoice === Structuring.Choice.NONE) return 'none';
    else if (structuringChoice === Structuring.Choice.REQUIRED) return 'auto';
    else if (structuringChoice === Structuring.Choice.ANYONE) return 'auto';
    else if (structuringChoice === Structuring.Choice.AUTO) return 'auto';

    else if (structuringChoice === Structuring.Choice.TCall.REQUIRED) return 'required';
    else if (structuringChoice === Structuring.Choice.TCall.ANYONE) return 'required';
    else if (structuringChoice instanceof Structuring.Choice.TCall.FCall)
        return {
            type: 'allowed_tools',
            mode: 'required',
            tools: [{ type: 'function', name: structuringChoice.name }] satisfies OpenAI.Responses.ToolChoiceFunction[],
        };

    else if (structuringChoice === Structuring.Choice.VRequest.REQUIRED) return 'none';
    else if (structuringChoice === Structuring.Choice.VRequest.ANYONE) return 'none';
    else if (structuringChoice instanceof Structuring.Choice.VRequest) return 'none';

    else throw new Error();
}
