import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';


const cacheDeveloperMessages = new WeakMap<Engine.Message.Developer, string>();
const cacheInputMessages = new WeakMap<Engine.Message.Input<Function.Decl.Proto>, OpenAI.Responses.ResponseInput>();
const cacheOutputMessages = new WeakMap<Engine.Message.Output<Function.Decl.Proto>, OpenAI.Responses.ResponseInput>();

export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
    }

    public decodeOutputMessage(
        raw: OpenAI.Responses.Response,
    ): Engine.Message.Output.From<fdm> {
        const parts: Engine.Message.Output.Part.From<fdm>[] = [];
        for (const item of raw.output) {
            if (item.type === 'message')
                for (const part of item.content)
                    if (part.type === 'output_text')
                        parts.push(new Text(part.text));
                    else if (part.type === 'refusal')
                        throw new Engine.Exceptions.InferenceError('Refusal', { cause: raw });
                    else throw new Error('Unsupported API output message part.', { cause: part });
            else if (item.type === 'function_call')
                parts.push(this.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'reasoning') {}
            else throw new Error('Unsupported API output item.', { cause: item });
        }
        const outm = new Engine.Message.Output(parts);
        if (raw.output.every(item => item.type !== 'computer_call_output')) {} else
            throw new Error('Computer calls are not supported yet.');
        cacheOutputMessages.set(outm, raw.output);
        return outm;
    }

    public encodeUserMessagePart(part: Text | Media): OpenAI.Responses.ResponseInputContent {
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
        else throw new Error('Unsupported user message part.', { cause: part });
    }

    public encodeInputMessage(
        inm: Engine.Message.Input.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        if (cacheInputMessages.has(inm)) return cacheInputMessages.get(inm)!;
        const responseInput: OpenAI.Responses.ResponseInput = [];
        const content: OpenAI.Responses.ResponseInputContent[] = [];
        for (const part of inm.parts)
            if (part instanceof Function.Response) {
                const fr = part as Function.Response.From<fdm>;
                responseInput.push(this.toolCodec.encodeFunctionResponse(fr));
            } else
                content.push(this.encodeUserMessagePart(part));
        if (content.length) responseInput.push({
            type: 'message',
            role: 'user',
            content,
        });
        cacheInputMessages.set(inm, responseInput);
        return responseInput;
    }

    public encodeOutputMessage(
        outm: Engine.Message.Output.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        if (cacheOutputMessages.has(outm)) return cacheOutputMessages.get(outm)!;
        throw new Error('Only native output message allowed.', { cause: outm });
    }

    public encodeDeveloperMessage(developerMessage: Engine.Message.Developer): string {
        if (cacheDeveloperMessages.has(developerMessage)) return cacheDeveloperMessages.get(developerMessage)!;
        const raw = developerMessage.getOnlyTextParts().map(part => part.raw).join('');
        cacheDeveloperMessages.set(developerMessage, raw);
        return raw;
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        if (chatMessage instanceof Engine.Message.Input) {
            const inm = chatMessage as Engine.Message.Input.From<fdm>;
            return this.encodeInputMessage(inm);
        } else if (chatMessage instanceof Engine.Message.Output) {
            const outm = chatMessage as Engine.Message.Output.From<fdm>;
            return this.encodeOutputMessage(outm);
        } else throw new Error();
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
    }
}
