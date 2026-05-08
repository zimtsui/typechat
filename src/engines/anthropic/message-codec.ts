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
        userMessage: Engine.RoleMessage.User.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const part of userMessage.getParts())
            if (part instanceof Engine.RoleMessage.User.Part.Text)
                blocks.push({
                    type: 'text',
                    text: part.text,
                });
            else if (part instanceof Function.Response) {
                const fres = part as Function.Response.From<fdm>;
                blocks.push(this.toolCodec.encodeFunctionResponse(fres));
            } else if (part instanceof Media.Text)
                blocks.push({
                    type: 'text',
                    text: part.quote(),
                });
            else throw new Error('Unknown user message part type', { cause: part });
        return blocks;
    }

    public encodeAiMessage(
        aiMessage: Engine.RoleMessage.Ai.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        if (aiMessage instanceof RoleMessage.Ai) {
            const nativeAiMessage = aiMessage as RoleMessage.Ai.From<fdm>;
            return nativeAiMessage.getRaw();
        }
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const part of aiMessage.getParts())
            if (part instanceof Engine.RoleMessage.Ai.Part.Text)
                blocks.push({
                    type: 'text',
                    text: part.text,
                });
            else if (part instanceof Function.Call) {
                const fcall = part as Function.Call.From<fdm>;
                blocks.push(this.toolCodec.encodeFunctionCall(fcall));
            } else throw new Error('Unknown AI message part type', { cause: part });
        return blocks;
    }

    public encodeDeveloperMessage(
        developerMessage: Engine.RoleMessage.Developer,
    ): Anthropic.TextBlockParam[] {
        return developerMessage.getOnlyTextParts().map(part => ({ type: 'text', text: part.text }));
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof Engine.RoleMessage.User) {
            const userMessage = chatMessage as Engine.RoleMessage.User.From<fdm>;
            return { role: 'user', content: this.encodeUserMessage(userMessage) };
        } else if (chatMessage instanceof Engine.RoleMessage.Ai) {
            const aiMessage = chatMessage as Engine.RoleMessage.Ai.From<fdm>;
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
                parts.push(new RoleMessage.Ai.Part.Text(item.text));
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
