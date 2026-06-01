import { Engine } from '../../engine.ts';
import { RoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
    }

    public encodeUserMessage(
        userMessage: Engine.Message.Input.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const part of userMessage.getParts())
            if (part instanceof Engine.Message.Part.Text)
                blocks.push({
                    type: 'text',
                    text: part.text,
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
        return blocks;
    }

    public encodeAiMessage(
        aiMessage: Engine.Message.Output.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        if (aiMessage instanceof RoleMessage.Ai) {
            const nativeAiMessage = aiMessage as RoleMessage.Ai.From<fdm>;
            return nativeAiMessage.getRaw();
        }
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const part of aiMessage.getParts())
            if (part instanceof Engine.Message.Part.Text)
                blocks.push({
                    type: 'text',
                    text: part.text,
                });
            else if (part instanceof Function.Call) {
                const fc = part as Function.Call.From<fdm>;
                blocks.push(this.toolCodec.encodeFunctionCall(fc));
            } else throw new Error('Unknown AI message part type', { cause: part });
        return blocks;
    }

    public encodeDeveloperMessage(
        developerMessage: Engine.Message.Developer,
    ): Anthropic.TextBlockParam[] {
        return developerMessage.getOnlyTextParts().map(part => ({ type: 'text', text: part.raw }));
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof Engine.Message.Input) {
            const userMessage = chatMessage as Engine.Message.Input.From<fdm>;
            return { role: 'user', content: this.encodeUserMessage(userMessage) };
        } else if (chatMessage instanceof Engine.Message.Output) {
            const aiMessage = chatMessage as Engine.Message.Output.From<fdm>;
            return { role: 'assistant', content: this.encodeAiMessage(aiMessage) };
        }
        else throw new Error('Unsupported chat message type.');
    }

    public decodeAiMessage(
        raw: Anthropic.ContentBlock[],
    ): RoleMessage.Ai.From<fdm> {
        const parts: unknown[] = [];
        for (const item of raw) {
            if (item.type === 'text')
                parts.push(new RoleMessage.Part.Text(item.text));
            else if (item.type === 'tool_use')
                parts.push(this.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'thinking') {}
            else throw new Error();
        }
        return new RoleMessage.Ai(parts, raw);
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
    }
}
