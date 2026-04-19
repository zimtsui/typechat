import { RoleMessage, type Session } from './session.ts';
import { Function } from '../../function.ts';
import { Tool } from './tool.ts';
import OpenAI from 'openai';
import { MessageCodec as CompatibleMessageCodec } from '../../compatible-engine.d/openai-responses/message-codec.ts';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';



export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    protected compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
    protected vdm: vdm;
    public constructor(options: MessageCodec.Options<fdm, vdm>) {
        this.toolCodec = options.toolCodec;
        this.compatibleMessageCodec = options.compatibleMessageCodec;
        this.vdm = options.vdm;
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): OpenAI.Responses.ResponseInputItem.FunctionCallOutput {
        return this.toolCodec.encodeFunctionResponse(fr);
    }

    public decodeAiMessage(
        output: OpenAI.Responses.ResponseOutputItem[],
    ): RoleMessage.Ai.From<fdm, vdm> {
        const parts: RoleMessage.Ai.Part.From<fdm, vdm>[] = [];
        for (const item of output) {
            if (item.type === 'message')
                for (const part of item.content)
                    if (part.type === 'output_text') {
                        const vrs = VerbatimCodec.Request.decode(part.text, this.vdm);
                        parts.push(new RoleMessage.Part.Text(part.text, vrs));
                    } else if (part.type === 'refusal')
                        throw new SyntaxError('Refusal', { cause: output });
                    else throw new Error();
            else if (item.type === 'function_call')
                parts.push(this.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'reasoning') {}
            else if (item.type === 'apply_patch_call')
                parts.push(new Tool.ApplyPatch.Call(item));
            else throw new Error();
        };
        return new RoleMessage.Ai(parts, output);
    }

    public encodeUserMessage(
        userMessage: RoleMessage.User.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        const responseInput: OpenAI.Responses.ResponseInput = [];
        let content: OpenAI.Responses.ResponseInputContent[] = [];
        function flush() {
            if (content.length) {
                responseInput.push({
                    type: 'message',
                    role: 'user',
                    content,
                });
                content = [];
            }
        }
        for (const part of userMessage.getParts()) {
            if (part instanceof RoleMessage.Part.Text)
                content.push({
                    type: 'input_text',
                    text: part.text,
                });
            else if (part instanceof Function.Response) {
                flush();
                responseInput.push(this.encodeFunctionResponse(part));
            } else if (part instanceof Tool.ApplyPatch.Response) {
                flush();
                responseInput.push({
                    type: 'apply_patch_call_output',
                    call_id: part.id,
                    status: part.failure ? 'failed' : 'completed',
                    output: part.failure || undefined,
                });
            } else throw new Error();
        };
        flush();
        return responseInput;
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseInput {
        const responseInput = aiMessage.getRaw();
        if (responseInput.every(item => item.type !== 'computer_call_output')) {} else
            throw new Error('Computer calls are not supported yet.');
        return responseInput;
    }

    public encodeDeveloperMessage(
        developerMessage: RoleMessage.Developer,
    ): string {
        return this.compatibleMessageCodec.encodeDeveloperMessage(developerMessage);
    }

    public encodeChatMessage(
        chatMessage: Session.ChatMessage.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseInput {
        if (chatMessage instanceof RoleMessage.User)
            return this.encodeUserMessage(chatMessage);
        else if (chatMessage instanceof RoleMessage.Ai)
            return this.encodeAiMessage(chatMessage);
        else throw new Error();
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
        compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
        vdm: vdm;
    }
}
