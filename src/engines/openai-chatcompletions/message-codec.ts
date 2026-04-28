import { RoleMessage } from '../../message.ts';
import { type Session } from '../../session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
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

    public decodeAiMessage(
        message: OpenAI.ChatCompletionMessage,
    ): RoleMessage.Ai.From<fdm, vdm> {
        const parts: unknown[] = [];
        if (message.content) {
            const vrs = VerbatimCodec.Request.decode(message.content, this.vdm);
            parts.push(new RoleMessage.Ai.Part.Text(message.content, vrs));
        }
        if (message.tool_calls)
            for (const apifc of message.tool_calls)
                if (apifc.type === 'function')
                    parts.push(this.toolCodec.decodeFunctionCall(apifc));
                else throw new Error();
        if (parts.length) return new RoleMessage.Ai(parts);
        else throw new SyntaxError('Content or tool calls not found in Response', { cause: message });
    }

    public encodeDeveloperMessage(developerMessage: RoleMessage.Developer): OpenAI.ChatCompletionSystemMessageParam {
        return {
            role: 'system',
            content: developerMessage.getOnlyTextParts().map(part => part.text).join(''),
        };
    }

    public encodeUserMessage(
        userMessage: RoleMessage.User.From<fdm>,
    ): [OpenAI.ChatCompletionUserMessageParam] | OpenAI.ChatCompletionToolMessageParam[] {
        const textParts: RoleMessage.User.Part.Text[] = [];
        for (const part of userMessage.getParts())
            if (part instanceof RoleMessage.User.Part.Text) {
                const textPart = part;
                textParts.push(textPart);
            }
        const frs = userMessage.getFunctionResponses();
        if (textParts.length && !frs.length)
            return [{ role: 'user', content: textParts.map(part => ({ type: 'text', text: part.text })) }];
        else if (!textParts.length && frs.length)
            return frs.map(fr => this.toolCodec.encodeFunctionResponse(fr));
        else throw new Error('Unsupported user message type.');
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): OpenAI.ChatCompletionAssistantMessageParam {
        const parts = aiMessage.getParts();
        const textParts: RoleMessage.Ai.Part.Text.From<vdm>[] = [];
        const fcParts: Function.Call.From<fdm>[] = [];
        for (const part of parts) {
            if (part instanceof RoleMessage.Ai.Part.Text) {
                const textPart = part as RoleMessage.Ai.Part.Text.From<vdm>;
                textParts.push(textPart);
            } else if (part instanceof Function.Call) {
                const fc = part as Function.Call.From<fdm>;
                fcParts.push(fc);
            }
        }
        return {
            role: 'assistant',
            content: textParts.length ? textParts.map(part => part.text).join('') : undefined,
            tool_calls: fcParts.length ? fcParts.map(fc => this.toolCodec.encodeFunctionCall(fc)) : undefined,
        };
    }

    public encodeRoleMessage(
        roleMessage: Session.ChatMessage.From<fdm, vdm> | RoleMessage.Developer,
    ): OpenAI.ChatCompletionMessageParam[] {
        if (roleMessage instanceof RoleMessage.Developer)
            return [this.encodeDeveloperMessage(roleMessage)];
        else if (roleMessage instanceof RoleMessage.User) {
            const userMessage = roleMessage as RoleMessage.User.From<fdm>;
            return this.encodeUserMessage(userMessage);
        } else if (roleMessage instanceof RoleMessage.Ai) {
            const aiMessage = roleMessage as RoleMessage.Ai.From<fdm, vdm>;
            return [this.encodeAiMessage(aiMessage)];
        }
        else throw new Error();
    }

    public encodeRoleMessages(
        chatMessages: (Session.ChatMessage.From<fdm, vdm> | RoleMessage.Developer)[],
    ): OpenAI.ChatCompletionMessageParam[] {
        return chatMessages.map(chatMessage => this.encodeRoleMessage(chatMessage)).flat();
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
