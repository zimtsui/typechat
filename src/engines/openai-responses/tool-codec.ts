import OpenAI from 'openai';
import { Function } from '../../function.ts';
import { Parse, ParseError } from 'typebox/schema';
import { addAdditionalProperties } from '../../function/parameters.ts';
import { Engine } from '../../engine.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';



export class ToolCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected fdm: fdm;
    protected rawfds: OpenAI.Responses.FunctionTool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.rawfds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public encodeFunctionResponsePart(part: Text | Media): OpenAI.Responses.ResponseFunctionCallOutputItem {
        if (part instanceof Text)
            return {
                type: 'input_text',
                text: part.raw,
            };
        else if (part instanceof Media.Text)
            return {
                type: 'input_text',
                text: part.quote(),
            };
        else if (part instanceof Media.Image)
            return {
                type: 'input_image',
                image_url: `data:${part.mimeType};base64,${part}`,
                detail: 'high',
            };
        else if (part instanceof Media.Pdf)
            return {
                type: 'input_file',
                file_data: `data:${part.mimeType};base64,${part}`,
            };
        else throw new Error();
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): OpenAI.Responses.ResponseInputItem.FunctionCallOutput {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful)
            return {
                type: 'function_call_output',
                call_id: fr.id,
                output: fr.parts.map(part => this.encodeFunctionResponsePart(part)),
            };
        else if (fr instanceof Function.Response.Failed)
            return {
                type: 'function_call_output',
                call_id: fr.id,
                output: fr.error,
            };
        else throw new Error();
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
    ): OpenAI.Responses.FunctionTool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            parameters: addAdditionalProperties(fdentry[1].parameters) as OpenAI.FunctionParameters,
            strict: true,
            type: 'function',
        };
    }

    public encodeFunctionDeclarationMap(): OpenAI.Responses.FunctionTool[] {
        return this.rawfds.slice();
    }

    public decodeFunctionCall(
        rawfc: OpenAI.Responses.ResponseFunctionToolCall,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[rawfc.name];
        if (fditem) {} else throw new Engine.Exceptions.InferenceError('Unknown function call', { cause: rawfc });
        let args: unknown;
        try {
            args = JSON.parse(rawfc.arguments);
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
            id: rawfc.call_id,
            name: rawfc.name,
            args,
        } as Function.Call.Options.From<fdm>);
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
