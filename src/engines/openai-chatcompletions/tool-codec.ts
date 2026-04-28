import { Parse, ParseError } from 'typebox/schema';
import { Function } from '../../function.ts';
import OpenAI from 'openai';


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    protected apiFds: OpenAI.ChatCompletionTool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.apiFds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public encodeFunctionCall(
        fcall: Function.Call.From<fdm>,
    ): OpenAI.ChatCompletionMessageToolCall {
        if (fcall.id) {} else throw new Error();
        return {
            id: fcall.id,
            type: 'function',
            function: {
                name: fcall.name,
                arguments: JSON.stringify(fcall.args),
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
        fres: Function.Response.From<fdm>,
    ): OpenAI.ChatCompletionToolMessageParam {
        if (fres.id) {} else throw new Error();
        if (fres instanceof Function.Response.Successful)
            return {
                role: 'tool',
                tool_call_id: fres.id,
                content: fres.text,
            };
        else if (fres instanceof Function.Response.Failed)
            return {
                role: 'tool',
                tool_call_id: fres.id,
                content: fres.error,
            };
        else throw new Error();
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
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

    public encodeFunctionDeclarationMap(): OpenAI.ChatCompletionTool[] {
        return this.apiFds;
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
