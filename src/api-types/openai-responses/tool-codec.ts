import OpenAI from 'openai';
import { Function } from '../../function.ts';
import { Parse, ParseError } from 'typebox/schema';




export class ToolCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected fdm: fdm;
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): OpenAI.Responses.ResponseInputItem.FunctionCallOutput {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful)
            return {
                type: 'function_call_output',
                call_id: fr.id,
                output: fr.text,
            };
        else if (fr instanceof Function.Response.Failed)
            return {
                type: 'function_call_output',
                call_id: fr.id,
                output: fr.error,
            };
        else throw new Error();
    }

    protected encodeFunctionDeclarationEntry(
        fdentry: Function.Decl.Entry.From<fdm>,
    ): OpenAI.Responses.FunctionTool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            parameters: fdentry[1].parameters as unknown as OpenAI.FunctionParameters,
            strict: true,
            type: 'function',
        };
    }

    public encodeFunctionDeclarationMap(fdm: fdm): OpenAI.Responses.FunctionTool[] {
        const fdentries = Object.entries(fdm) as Function.Decl.Entry.From<fdm>[];
        return fdentries.map(fdentry => this.encodeFunctionDeclarationEntry(fdentry));
    }

    public decodeFunctionCall(
        apifc: OpenAI.Responses.ResponseFunctionToolCall,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[apifc.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: apifc });
        const args = (() => {
            try {
                return JSON.parse(apifc.arguments);
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
            id: apifc.call_id,
            name: apifc.name,
            args,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionCall(
        fc: Function.Call.From<fdm>,
    ): OpenAI.Responses.ResponseFunctionToolCall {
        if (fc.id) {} else throw new Error();
        return {
            type: 'function_call',
            call_id: fc.id,
            name: fc.name,
            arguments: JSON.stringify(fc.args),
        };
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
