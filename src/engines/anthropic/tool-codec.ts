import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import { Parse, ParseError } from 'typebox/schema';
import { Engine } from '../../engine.ts';
import { Text } from '../../text.ts';
import { Media } from '../../media.ts';


export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    protected rawfds: Anthropic.Tool[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.rawfds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public decodeFunctionCall(
        rawfc: Anthropic.ToolUseBlock,
    ): Function.Call.From<fdm> {
        const fditem = this.fdm[rawfc.name];
        if (fditem) {} else throw new Engine.Exceptions.InferenceError('Unknown function call', { cause: rawfc });
        try {
            Parse(fditem.parameters, rawfc.input);
        } catch (e) {
            if (e instanceof ParseError)
                throw new Engine.Exceptions.InferenceError('Invalid arguments of function call.', { cause: e });
            else throw e;
        }
        return Function.Call.of({
            id: rawfc.id,
            name: rawfc.name,
            args: rawfc.input,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): Anthropic.ToolResultBlockParam {
        if (fr.id) {} else throw new Error();
        if (fr instanceof Function.Response.Successful)
            return {
                type: 'tool_result',
                tool_use_id: fr.id,
                content: fr.parts.map(part => this.encodeFunctionResponsePart(part)),
            };
        else if (fr instanceof Function.Response.Failed)
            return {
                type: 'tool_result',
                tool_use_id: fr.id,
                content: fr.error,
            };
        else throw new Error();
    }

    public encodeFunctionResponsePart(part: Function.Response.Successful.Part): Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam {
        if (part instanceof Text)
            return {
                type: 'text',
                text: part.raw,
            };
        else if (part instanceof Media.Text)
            return {
                type: 'text',
                text: part.quote(),
            };
        else if (part instanceof Media.Image)
            return {
                type: 'image',
                source: {
                    type: 'base64',
                    data: String(part),
                    media_type: String(part.mimeType.essence) as Anthropic.Base64ImageSource['media_type'],
                },
            };
        else if (part instanceof Media.Pdf)
            return {
                type: 'document',
                source: {
                    type: 'base64',
                    data: String(part),
                    media_type: 'application/pdf',
                },
            };
        else throw new Error('Unsupported function response part.', { cause: part });
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
    ): Anthropic.Tool {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            input_schema: fdentry[1].parameters as unknown as Anthropic.Tool.InputSchema,
        };
    }

    public encodeFunctionDeclarationMap(): Anthropic.Tool[] {
        return this.rawfds.slice();
    }
}

export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
