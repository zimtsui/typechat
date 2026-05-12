import { Engine } from '../../engine.ts';
import { RoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import { Tool } from './tool.ts';
import OpenAI from 'openai';
import type { ToolCodec } from './tool-codec.ts';
import { Media } from '../../media.ts';


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
> {
    protected toolCodec: ToolCodec<fdm>;
    public constructor(options: MessageCodec.Options<fdm>) {
        this.toolCodec = options.toolCodec;
    }

    public decodeAiMessage(
        raw: OpenAI.Responses.Response,
    ): RoleMessage.Ai.From<fdm> {
        const parts: unknown[] = [];
        for (const item of raw.output) {
            if (item.type === 'message')
                for (const part of item.content)
                    if (part.type === 'output_text')
                        parts.push(new RoleMessage.Part.Text(part.text));
                    else if (part.type === 'refusal')
                        throw new SyntaxError('Refusal', { cause: raw });
                    else throw new Error();
            else if (item.type === 'function_call')
                parts.push(this.toolCodec.decodeFunctionCall(item));
            else if (item.type === 'reasoning') {}
            else if (item.type === 'apply_patch_call')
                parts.push(new Tool.ApplyPatch.Call(item));
            else throw new Error();
        }
        return new RoleMessage.Ai(parts, raw);
    }

    public encodeUserMessage(
        userMessage: Engine.RoleMessage.User.From<fdm>,
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
            if (part instanceof Engine.RoleMessage.Part.Text)
                content.push({
                    type: 'input_text',
                    text: part.text,
                });
            else if (part instanceof Media.Text)
                content.push({
                    type: 'input_text',
                    text: part.quote(),
                });
            else if (part instanceof Media.Image)
                content.push({
                    type: 'input_image',
                    image_url: `data:${part.mimeType};base64,${part.base64}`,
                    detail: 'high',
                });
            else if (part instanceof Media.Pdf)
                content.push({
                    type: 'input_file',
                    file_data: `data:${part.mimeType};base64,${part.base64}`,
                });
            else if (part instanceof Function.Response) {
                const fr = part as Function.Response.From<fdm>;
                flush();
                responseInput.push(this.toolCodec.encodeFunctionResponse(fr));
            } else if (part instanceof Tool.ApplyPatch.Response) {
                flush();
                responseInput.push({
                    type: 'apply_patch_call_output',
                    call_id: part.id,
                    status: part.failure ? 'failed' : 'completed',
                    output: part.failure || undefined,
                });
            } else throw new Error('Unknown user message part type', { cause: part });
        }
        flush();
        return responseInput;
    }

    public encodeAiMessage(
        aiMessage: Engine.RoleMessage.Ai.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        if (aiMessage instanceof RoleMessage.Ai) {
            const nativeAiMessage = aiMessage as RoleMessage.Ai.From<fdm>;
            const raw = nativeAiMessage.getRaw();
            if (raw.output.every(item => item.type !== 'computer_call_output')) {} else
                throw new Error('Computer calls are not supported yet.');
            return raw.output;
        }
        const responseInput: OpenAI.Responses.ResponseInput = [];
        for (const part of aiMessage.getParts()) {
            if (part instanceof RoleMessage.Part.Text)
                responseInput.push({
                    role: 'assistant',
                    content: part.text,
                });
            else if (part instanceof Function.Call) {
                const fc = part as Function.Call.From<fdm>;
                responseInput.push(this.toolCodec.encodeFunctionCall(fc));
            } else throw new Error('Unknown AI message part type', { cause: part });
        }
        return responseInput;
    }

    public encodeDeveloperMessage(developerMessage: Engine.RoleMessage.Developer): string {
        return developerMessage.getOnlyTextParts().map(part => part.text).join('');
    }

    public encodeChatMessage(
        chatMessage: Engine.Session.ChatMessage.From<fdm>,
    ): OpenAI.Responses.ResponseInput {
        if (chatMessage instanceof Engine.RoleMessage.User) {
            const userMessage = chatMessage as Engine.RoleMessage.User.From<fdm>;
            return this.encodeUserMessage(userMessage);
        } else if (chatMessage instanceof Engine.RoleMessage.Ai) {
            const aiMessage = chatMessage as Engine.RoleMessage.Ai.From<fdm>;
            return this.encodeAiMessage(aiMessage);
        }
        else throw new Error();
    }
}

export namespace MessageCodec {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        toolCodec: ToolCodec<fdm>;
    }
}
