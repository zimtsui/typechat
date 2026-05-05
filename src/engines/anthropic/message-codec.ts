import { Engine } from '../../engine.ts';
import { RoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import type { ToolCodec } from './tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    protected vdm: vdm;
    public constructor(options: MessageCodec.Options<fdm, vdm>) {
        this.toolCodec = options.toolCodec;
        this.vdm = options.vdm;
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
            } else throw new Error('Unknown user message part type', { cause: part });
        return blocks;
    }

    public encodeAiMessage(
        aiMessage: Engine.RoleMessage.Ai.From<fdm, vdm>,
    ): Anthropic.ContentBlockParam[] {
        if (aiMessage instanceof RoleMessage.Ai) {
            const nativeAiMessage = aiMessage as RoleMessage.Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
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
        chatMessage: Engine.Session.ChatMessage.From<fdm, vdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof Engine.RoleMessage.User) {
            const userMessage = chatMessage as Engine.RoleMessage.User.From<fdm>;
            return { role: 'user', content: this.encodeUserMessage(userMessage) };
        } else if (chatMessage instanceof Engine.RoleMessage.Ai) {
            const aiMessage = chatMessage as Engine.RoleMessage.Ai.From<fdm, vdm>;
            return { role: 'assistant', content: this.encodeAiMessage(aiMessage) };
        }
        else throw new Error('Unsupported chat message type.');
    }

    public decodeAiMessage(
        raw: Anthropic.ContentBlock[],
    ): RoleMessage.Ai.From<fdm, vdm> {
        const parts: unknown[] = [];
        for (const item of raw) {
            if (item.type === 'text') {
                const vreqs = VerbatimCodec.Request.decode(item.text, this.vdm);
                parts.push(new RoleMessage.Ai.Part.Text(item.text, vreqs));
            } else if (item.type === 'tool_use')
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
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        vdm: vdm;
    }
}
