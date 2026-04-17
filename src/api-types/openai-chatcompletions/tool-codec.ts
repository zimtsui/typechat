import { Function } from '../../function.ts';
import OpenAI from 'openai';
import Ajv from 'ajv';

const ajv = new Ajv();


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    public constructor(protected comps: ToolCodec.Components<fdm>) {}


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
        const fditem = this.comps.fdm[apifc.function.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: apifc });
        const args = (() => {
            try {
                return JSON.parse(apifc.function.arguments);
            } catch (e) {
                throw new SyntaxError('Invalid JSON of function call', { cause: apifc });
            }
        })();
        if (ajv.validate(fditem.parameters, args)) {}
        else throw new SyntaxError('Invalid function arguments', { cause: apifc });
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
                parameters: fdentry[1].parameters,
            },
        };
    }

    public encodeFunctionDeclarationMap(fdm: fdm): OpenAI.ChatCompletionTool[] {
        const fdentries = Object.entries(fdm) as Function.Decl.Entry.From<fdm>[];
        return fdentries.map(fdentry => this.encodeFunctionDeclarationEntry(fdentry));
    }


}

export namespace ToolCodec {
    export interface Components<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
