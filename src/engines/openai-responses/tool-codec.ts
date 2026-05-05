import OpenAI from 'openai';
import { Function } from '../../function.ts';
import { Parse, ParseError } from 'typebox/schema';


export class ToolCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected fdm: fdm;
    protected apiFds: OpenAI.Responses.FunctionTool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.apiFds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public encodeFunctionResponse(
        fres: Function.Response.From<fdm>,
    ): OpenAI.Responses.ResponseInputItem.FunctionCallOutput {
        if (fres.id) {} else throw new Error();
        if (fres instanceof Function.Response.Successful)
            return {
                type: 'function_call_output',
                call_id: fres.id,
                output: fres.text,
            };
        else if (fres instanceof Function.Response.Failed)
            return {
                type: 'function_call_output',
                call_id: fres.id,
                output: fres.error,
            };
        else throw new Error();
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
    ): OpenAI.Responses.FunctionTool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            parameters: fdentry[1].parameters as unknown as OpenAI.FunctionParameters,
            strict: true,
            type: 'function',
        };
    }

    public encodeFunctionDeclarationMap(): OpenAI.Responses.FunctionTool[] {
        return this.apiFds.slice();
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
        fcall: Function.Call.From<fdm>,
    ): OpenAI.Responses.ResponseFunctionToolCall {
        if (fcall.id) {} else throw new Error();
        return {
            type: 'function_call',
            call_id: fcall.id,
            name: fcall.name,
            arguments: JSON.stringify(fcall.args),
        };
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
