import { RoleMessage } from '../../message.ts';
import { type Session } from '../../session.ts';
import { NativeRoleMessage } from './message.ts';
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
        userMessage: RoleMessage.User.From<fdm>,
    ): Anthropic.ContentBlockParam[] {
        return userMessage.getParts().map(part => {
            if (part instanceof RoleMessage.User.Part.Text)
                return {
                    type: 'text',
                    text: part.text,
                } satisfies Anthropic.TextBlockParam;
            else if (part instanceof Function.Response) {
                const fres = part as Function.Response.From<fdm>;
                return this.toolCodec.encodeFunctionResponse(fres);
            }
            else throw new Error('Unknown user message part type', { cause: part });
        });
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): Anthropic.ContentBlockParam[] {
        if (aiMessage instanceof NativeRoleMessage.Ai) {
            const nativeMessage = aiMessage as NativeRoleMessage.Ai<Function.Decl.From<fdm>, Verbatim.Decl.From<vdm>>;
            return nativeMessage.getRaw();
        }
        return aiMessage.getParts().map(part => {
            if (part instanceof RoleMessage.Ai.Part.Text)
                return {
                    type: 'text',
                    text: part.text,
                } satisfies Anthropic.TextBlockParam;
            else if (part instanceof Function.Call) {
                const fcall = part as Function.Call.From<fdm>;
                return this.toolCodec.encodeFunctionCall(fcall);
            }
            else throw new Error('Unknown AI message part type', { cause: part });
        });
    }

    public encodeDeveloperMessage(
        developerMessage: RoleMessage.Developer,
    ): Anthropic.TextBlockParam[] {
        return developerMessage.getOnlyTextParts().map(part => ({ type: 'text', text: part.text }));
    }

    public encodeChatMessage(
        chatMessage: Session.ChatMessage.From<fdm, vdm>,
    ): Anthropic.MessageParam {
        if (chatMessage instanceof RoleMessage.User) {
            const userMessage = chatMessage as RoleMessage.User.From<fdm>;
            return { role: 'user', content: this.encodeUserMessage(userMessage) };
        } else if (chatMessage instanceof RoleMessage.Ai) {
            const aiMessage = chatMessage as RoleMessage.Ai.From<fdm, vdm>;
            return { role: 'assistant', content: this.encodeAiMessage(aiMessage) };
        }
        else throw new Error('Unsupported chat message type.');
    }

    public decodeAiMessage(
        raw: Anthropic.ContentBlock[],
    ): NativeRoleMessage.Ai.From<fdm, vdm> {
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
        return new NativeRoleMessage.Ai(parts, raw);
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
