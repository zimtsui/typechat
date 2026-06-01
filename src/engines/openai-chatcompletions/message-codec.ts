import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected cacheDeveloperMessages = new WeakMap<Engine.Message.Developer, OpenAI.ChatCompletionSystemMessageParam>();
    protected cacheInputMessages = new WeakMap<Engine.Message.Input<Function.Decl.Proto>, (OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionToolMessageParam)[]>();
    protected cacheOutputMessages = new WeakMap<Engine.Message.Output<Function.Decl.Proto>, OpenAI.ChatCompletionAssistantMessageParam>();
    protected toolCodec: ToolCodec<fdm>;
    protected messageValidator: Engine.MessageValidator.From<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
        this.messageValidator = options.messageValidator;
    }

    public decodeOutputMessage(
        message: OpenAI.ChatCompletionMessage,
    ): Engine.Message.Output.From<fdm> {
        if (message.refusal)
            throw new Engine.Exceptions.InferenceError('Refusal', { cause: message });
        const parts: Engine.Message.Output.Part.From<fdm>[] = [];
        if (message.content)
            parts.push(new Text(message.content));
        if (message.tool_calls)
            for (const apifc of message.tool_calls)
                if (apifc.type === 'function')
                    parts.push(this.toolCodec.decodeFunctionCall(apifc));
                else throw new Error('Unsupported API tool call.', { cause: apifc });
        const outm = new Engine.Message.Output(parts);
        this.messageValidator.validateOutputMessage(outm);
        this.cacheOutputMessages.set(outm, message);
        return outm;
    }

    public encodeDeveloperMessage(developerMessage: Engine.Message.Developer): OpenAI.ChatCompletionSystemMessageParam {
        if (this.cacheDeveloperMessages.has(developerMessage)) return this.cacheDeveloperMessages.get(developerMessage)!;
        const raw: OpenAI.ChatCompletionSystemMessageParam = {
            role: 'system',
            content: developerMessage.getOnlyTextParts().map(part => part.raw).join(''),
        };
        this.cacheDeveloperMessages.set(developerMessage, raw);
        return raw;
    }

    public encodeInputMessage(
        inm: Engine.Message.Input.From<fdm>,
    ): (OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionToolMessageParam)[] {
        if (this.cacheInputMessages.has(inm)) return this.cacheInputMessages.get(inm)!;
        this.messageValidator.validateInputMessage(inm);
        for (const part of inm.parts)
            if (part instanceof Function.Response) {}
            else if (part instanceof Text) {}
            else if (part instanceof Media.Text) {}
            else throw new Error('Unsupported part type.');

        const apiMessages: (OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionToolMessageParam)[] = [];

        const frs = inm.getFunctionResponses();
        for (const fr of frs)
            apiMessages.push(this.toolCodec.encodeFunctionResponse(fr));

        const contentParts: OpenAI.ChatCompletionContentPart[] = [];
        for (const part of inm.parts)
            if (part instanceof Text)
                contentParts.push({ type: 'text', text: part.raw });
            else if (part instanceof Media.Text)
                contentParts.push({ type: 'text', text: part.quote() });
        if (contentParts.length)
            apiMessages.push({ role: 'user', content: contentParts });
        this.cacheInputMessages.set(inm, apiMessages);
        return apiMessages;
    }

    public encodeOutputMessage(
        outm: Engine.Message.Output.From<fdm>,
    ): OpenAI.ChatCompletionAssistantMessageParam {
        if (this.cacheOutputMessages.has(outm)) return this.cacheOutputMessages.get(outm)!;
        throw new Error('Only native output message allowed.', { cause: outm });
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): OpenAI.ChatCompletionMessageParam[] {
        if (chatMessage instanceof Engine.Message.Input) {
            const inm = chatMessage as Engine.Message.Input.From<fdm>;
            return this.encodeInputMessage(inm);
        } else if (chatMessage instanceof Engine.Message.Output) {
            const outm = chatMessage as Engine.Message.Output.From<fdm>;
            return [this.encodeOutputMessage(outm)];
        }
        else throw new Error();
    }

    public encodeChatMessages(
        chatMessages: Engine.Session.ChatMessage.From<fdm>[],
    ): OpenAI.ChatCompletionMessageParam[] {
        return chatMessages.map(chatMessage => this.encodeChatMessage(chatMessage)).flat();
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
