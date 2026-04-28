import { OpenAIResponsesStructuringChoice } from './structuring-choice.ts';
import type { Function } from '../../function.ts';
import type { Verbatim } from '../../verbatim.ts';
import type { OpenAI } from 'openai';


export function encode<
    fdu extends Function.Decl.Proto,
    vdu extends Verbatim.Decl.Proto,
>(
    choice: OpenAIResponsesStructuringChoice<fdu, vdu>,
): OpenAI.Responses.ToolChoiceOptions | OpenAI.Responses.ToolChoiceAllowed {
    if (choice === OpenAIResponsesStructuringChoice.NONE) return 'none';
    else if (choice === OpenAIResponsesStructuringChoice.REQUIRED) return 'auto';
    else if (choice === OpenAIResponsesStructuringChoice.ANYONE) return 'auto';
    else if (choice === OpenAIResponsesStructuringChoice.AUTO) return 'auto';

    else if (choice === OpenAIResponsesStructuringChoice.TCall.REQUIRED) return 'required';
    else if (choice === OpenAIResponsesStructuringChoice.TCall.ANYONE) return 'required';
    else if (choice instanceof OpenAIResponsesStructuringChoice.TCall.FCall)
        return {
            type: 'allowed_tools',
            mode: 'required',
            tools: [{ type: 'function', name: choice.name }] satisfies OpenAI.Responses.ToolChoiceFunction[],
        };

    else if (choice === OpenAIResponsesStructuringChoice.VRequest.REQUIRED) return 'none';
    else if (choice === OpenAIResponsesStructuringChoice.VRequest.ANYONE) return 'none';
    else if (choice instanceof OpenAIResponsesStructuringChoice.VRequest) return 'none';

    else throw new Error();
}

