import { Engine } from '../../engine.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';
import { Text } from '../../text.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected cacheDeveloperMessages = new WeakMap<Engine.Message.Developer, Anthropic.TextBlockParam[]>();
    protected cacheInputMessages = new WeakMap<Engine.Message.Input<Function.Decl.Proto>, Anthropic.ContentBlockParam[]>();
    protected cacheOutputMessages = new WeakMap<Engine.Message.Output<Function.Decl.Proto>, Anthropic.ContentBlockParam[]>();
    protected toolCodec: ToolCodec<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
    }

    public encodeInputMessage(
        inm: Engine.Message.Input.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        if (this.cacheInputMessages.has(inm)) return this.cacheInputMessages.get(inm)!;
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const part of inm.parts)
            if (part instanceof Text)
                blocks.push({
                    type: 'text',
                    text: part.raw,
                });
            else if (part instanceof Function.Response) {
                const fr = part as Function.Response.From<fdm>;
                blocks.push(this.toolCodec.encodeFunctionResponse(fr));
            } else if (part instanceof Media.Text)
                blocks.push({
                    type: 'text',
                    text: part.quote(),
                });
            else throw new Error('Unknown user message part type', { cause: part });
        this.cacheInputMessages.set(inm, blocks);
        return blocks;
    }

    public encodeOutputMessage(
        outm: Engine.Message.Output.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        if (this.cacheOutputMessages.has(outm)) return this.cacheOutputMessages.get(outm)!;
        throw new Error('Only native output message allowed.', { cause: outm });
    }

    public encodeDeveloperMessage(
        developerMessage: Engine.Message.Developer,
    ): Anthropic.TextBlockParam[] {
        if (this.cacheDeveloperMessages.has(developerMessage)) return this.cacheDeveloperMessages.get(developerMessage)!;
        const raw = developerMessage.getOnlyTextParts().map(part => ({ type: 'text' as const, text: part.raw }));
        this.cacheDeveloperMessages.set(developerMessage, raw);
        return raw;
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof Engine.Message.Input) {
            const inm = chatMessage as Engine.Message.Input.From<fdm>;
            return { role: 'user', content: this.encodeInputMessage(inm) };
        } else if (chatMessage instanceof Engine.Message.Output) {
            const outm = chatMessage as Engine.Message.Output.From<fdm>;
            return { role: 'assistant', content: this.encodeOutputMessage(outm) };
        }
        else throw new Error('Unsupported chat message type.');
    }

    public decodeOutputMessage(
        raw: Anthropic.ContentBlock[],
    ): Engine.Message.Output.From<fdm> {
        const parts: Engine.Message.Output.Part.From<fdm>[] = [];
        for (const item of raw) {
            if (item.type === 'text')
                parts.push(new Text(item.text));
            else if (item.type === 'tool_use')
                parts.push(this.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'thinking') {}
            else if (item.type === 'redacted_thinking') {}
            else throw new Error('Unsupported API output block.', { cause: item });
        }
        const outm = new Engine.Message.Output(parts);
        this.cacheOutputMessages.set(outm, raw);
        return outm;
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
    }
}
