import { Parse, ParseError } from 'typebox/schema';
import { Function } from '../../function.ts';
import OpenAI from 'openai';



export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
    }

    public encodeFunctionCall(
        fc: Function.Call.From<fdm>,
    ): OpenAI.ChatCompletionMessageToolCall {
        if (fc.id) {} else throw new Error();
        return {
            id: fc.id,
            type: 'function',
            function: {
                name: fc.name,
                arguments: JSON.stringify(fc.args),
            },
        };
    }

    public decodeFunctionCall(
        apifc: OpenAI.ChatCompletionMessageFunctionToolCall,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[apifc.function.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: apifc });
        const args = (() => {
            try {
                return JSON.parse(apifc.function.arguments);
            } catch (e) {
                throw new SyntaxError('Invalid JSON of function call', { cause: apifc });
            }
        })();
        try {
            Parse(fditem.parameters, args);
        } catch (e) {
            if (e instanceof ParseError)
                throw new SyntaxError('Invalid arguments of function call.', { cause: e });
            else throw e;
        }
        return Function.Call.of({
            id: apifc.id,
            name: apifc.function.name,
            args,
        } as Function.Call.Options.From<fdm>);
    }


    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): OpenAI.ChatCompletionToolMessageParam {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful)
            return {
                role: 'tool',
                tool_call_id: fr.id,
                content: fr.text,
            };
        else if (fr instanceof Function.Response.Failed)
            return {
                role: 'tool',
                tool_call_id: fr.id,
                content: fr.error,
            };
        else throw new Error();
    }

    protected encodeFunctionDeclarationEntry(
        fdentry: Function.Decl.Entry.From<fdm>,
    ): OpenAI.ChatCompletionTool {
        return {
            type: 'function',
            function: {
                name: fdentry[0],
                description: fdentry[1].description,
                strict: true,
                parameters: fdentry[1].parameters as unknown as OpenAI.FunctionParameters,
            },
        };
    }

    public encodeFunctionDeclarationMap(fdm: fdm): OpenAI.ChatCompletionTool[] {
        const fdentries = Object.entries(fdm) as Function.Decl.Entry.From<fdm>[];
        return fdentries.map(fdentry => this.encodeFunctionDeclarationEntry(fdentry));
    }


}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
