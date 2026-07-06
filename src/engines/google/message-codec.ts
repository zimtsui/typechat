import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { type ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';



export class MessageCodec<
    fdm extends Function.Decl.Map.Proto,
> {
    protected cacheDeveloperMessages = new WeakMap<Engine.Message.Developer, Google.Content>();
    protected cacheInputMessages = new WeakMap<Engine.Message.Input<Function.Decl.Proto>, Google.Content>();
    protected cacheOutputMessages = new WeakMap<Engine.Message.Output<Function.Decl.Proto>, Google.Content>();
    protected toolCodec: ToolCodec<fdm>;
    protected messageValidator: Engine.MessageValidator.From<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
        this.messageValidator = options.messageValidator;
    }

    public encodeOutputMessage(
        outm: Engine.Message.Output.From<fdm>,
    ): Google.Content {
        if (this.cacheOutputMessages.has(outm)) return this.cacheOutputMessages.get(outm)!;
        throw new Error('Only native output message allowed.', { cause: outm });
    }

    public encodeChatMessages(
        chatMessages: Engine.Session.ChatMessage.From<fdm>[],
    ): Google.Content[] {
        return chatMessages.map(chatMessage => this.encodeChatMessage(chatMessage));
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): Google.Content {
        if (chatMessage instanceof Engine.Message.Input) {
            const inm = chatMessage as Engine.Message.Input.From<fdm>;
            return this.encodeInputMessage(inm);
        } else if (chatMessage instanceof Engine.Message.Output) {
            const outm = chatMessage as Engine.Message.Output.From<fdm>;
            return this.encodeOutputMessage(outm);
        }
        else throw new Error();
    }

    public encodeInputMessage(
        inm: Engine.Message.Input.From<fdm>,
    ): Google.Content {
        if (this.cacheInputMessages.has(inm)) return this.cacheInputMessages.get(inm)!;
        this.messageValidator.validateInputMessage(inm);
        const apiParts: Google.PartUnion[] = [];
        for (const part of inm.parts) {
            if (part instanceof Text)
                apiParts.push(Google.createPartFromText(part.raw));
            else if (part instanceof Function.Response) {
                const fr = part as Function.Response.From<fdm>;
                apiParts.push(this.toolCodec.encodeFunctionResponse(fr));
            }
            else if (part instanceof Media.Pdf)
                apiParts.push(
                    Google.createPartFromBase64(
                        String(part), part.mimeType.essence,
                        Google.PartMediaResolutionLevel.MEDIA_RESOLUTION_MEDIUM,
                    ),
                );
            else if (part instanceof Media.Image)
                apiParts.push(
                    Google.createPartFromBase64(
                        String(part), part.mimeType.essence,
                        Google.PartMediaResolutionLevel.MEDIA_RESOLUTION_HIGH,
                    ),
                );
            else if (part instanceof Media.Text)
                apiParts.push(
                    Google.createPartFromText(part.quote()),
                );
            else throw new Error('Unknown user message part type', { cause: part });
        };
        const raw = Google.createUserContent(apiParts);
        this.cacheInputMessages.set(inm, raw);
        return raw;
    }

    public encodeDeveloperMessage(
        developerMessage: Engine.Message.Developer,
    ): Google.Content {
        if (this.cacheDeveloperMessages.has(developerMessage)) return this.cacheDeveloperMessages.get(developerMessage)!;
        const parts = developerMessage.getOnlyTextParts().map(part => Google.createPartFromText(part.raw));
        const raw = { parts };
        this.cacheDeveloperMessages.set(developerMessage, raw);
        return raw;
    }

    public decodeOutputMessage(
        content: Google.Content,
    ): Engine.Message.Output.From<fdm> {
        if (content.parts) {} else throw new Error();
        const parts: Engine.Message.Output.Part.From<fdm>[] = [];
        for (const part of content.parts) {
            if (part.text !== undefined)
                parts.push(new Text(part.text));
            if (part.functionCall)
                parts.push(this.toolCodec.decodeFunctionCall(part.functionCall));
            if (part.executableCode)
                throw new Error('Executable code is not supported.', { cause: part });
            if (part.codeExecutionResult)
                throw new Error('Code execution result is not supported.', { cause: part });
        }
        const outm = new Engine.Message.Output(parts);
        this.messageValidator.validateOutputMessage(outm);
        this.cacheOutputMessages.set(outm, content);
        return outm;
    }
}


export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        messageValidator: Engine.MessageValidator.From<fdm>;
    }

}
