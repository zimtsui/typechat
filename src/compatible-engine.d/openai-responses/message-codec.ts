import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { Media } from '../../media.ts';

const NOMINAL = Symbol();


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
        output: OpenAI.Responses.ResponseOutputItem[],
    ): MessageCodec.Message.Ai.From<fdm, vdm> {
        const parts: RoleMessage.Ai.Part.From<fdm, vdm>[] = [];
        for (const item of output)
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
            else throw new Error();
        return new MessageCodec.Message.Ai(parts, output);
    }

    protected encodeImageResolution(
        resolution: Media.Image.Resolution
    ): OpenAI.Responses.ResponseInputImage['detail'] {
        if (resolution === Media.Image.Resolution.LOW) return 'low';
        else if (resolution === Media.Image.Resolution.HIGH) return 'high';
        else if (resolution === Media.Image.Resolution.HIGHEST) return 'original';
        else if (resolution === Media.Image.Resolution.AUTO) return 'auto';
        else throw new Error();
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
            else if (part instanceof Media.Image)
                content.push({
                    type: 'input_image',
                    image_url: `data:${part.mimeType};base64,${part.base64}`,
                    detail: this.encodeImageResolution(part.resolution),
                });
            else if (part instanceof Media.Pdf)
                content.push({
                    type: 'input_file',
                    file_data: `data:${part.mimeType};base64,${part.base64}`,
                });
            else if (part instanceof Function.Response) {
                flush();
                responseInput.push(this.toolCodec.encodeFunctionResponse(part));
            } else throw new Error();
        }
        flush();
        return responseInput;
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseInput {
        if (aiMessage instanceof MessageCodec.Message.Ai) {
            const responseInput = aiMessage.getRaw();
            if (responseInput.every(item => item.type !== 'computer_call_output')) {} else
                throw new Error('Computer calls are not supported yet.');
            return responseInput;
        }
        const responseInput: OpenAI.Responses.ResponseInput = [];
        for (const part of aiMessage.getParts()) {
            if (part instanceof RoleMessage.Part.Text)
                responseInput.push({
                    role: 'assistant',
                    content: part.text,
                });
            else if (part instanceof Function.Call)
                responseInput.push(this.toolCodec.encodeFunctionCall(part));
            else throw new Error();
        };
        return responseInput;
    }

    public encodeDeveloperMessage(developerMessage: RoleMessage.Developer): string {
        return developerMessage.getText();
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
        vdm: vdm;
    }

    export namespace Message {
        export class Ai<
            out fdu extends Function.Decl.Proto,
            out vdu extends Verbatim.Decl.Proto,
        > extends RoleMessage.Ai<fdu, vdu> {
            public declare [NOMINAL]: void;
            public constructor(
                parts: RoleMessage.Ai.Part<fdu, vdu>[],
                protected raw: OpenAI.Responses.ResponseOutputItem[],
            ) {
                super(parts);
            }

            public getRaw(): OpenAI.Responses.ResponseOutputItem[] {
                return this.raw;
            }
        }
        export namespace Ai {
            export type From<
                fdm extends Function.Decl.Map.Proto,
                vdm extends Verbatim.Decl.Map.Proto,
            > = Ai<
                Function.Decl.From<fdm>,
                Verbatim.Decl.From<vdm>
            >;
        }
    }
}
