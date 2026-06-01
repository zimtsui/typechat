import { Parse, ParseError } from 'typebox/schema';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { Engine } from '../../engine.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    protected rawfds: OpenAI.ChatCompletionTool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.rawfds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public decodeFunctionCall(
        rawfc: OpenAI.ChatCompletionMessageFunctionToolCall,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[rawfc.function.name];
        if (fditem) {} else throw new Engine.Exceptions.InferenceError('Unknown function call', { cause: rawfc });
        let args: unknown;
        try {
            args = JSON.parse(rawfc.function.arguments);
        } catch (e) {
            throw new Engine.Exceptions.InferenceError('Invalid JSON of function call', { cause: rawfc });
        }
        try {
            Parse(fditem.parameters, args);
        } catch (e) {
            if (e instanceof ParseError)
                throw new Engine.Exceptions.InferenceError('Invalid arguments of function call.', { cause: e });
            else throw e;
        }
        return Function.Call.of({
            id: rawfc.id,
            name: rawfc.function.name,
            args,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): OpenAI.ChatCompletionToolMessageParam {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful) {
            if (fr.parts.length === 1) {} else
                throw new Error('OpenAI Chat Completions engine requires exactly one function response part.');
            return {
                role: 'tool',
                tool_call_id: fr.id,
                content: this.encodeFunctionResponsePart(fr.parts[0]!),
            };
        } else if (fr instanceof Function.Response.Failed)
            return {
                role: 'tool',
                tool_call_id: fr.id,
                content: fr.error,
            };
        else throw new Error();
    }

    public encodeFunctionResponsePart(part: Function.Response.Successful.Part): string {
        if (part instanceof Text)
            return part.raw;
        else if (part instanceof Media.Text)
            return part.quote();
        else throw new Error('Unsupported function response part.', { cause: part });
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
        return this.rawfds.slice();
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
