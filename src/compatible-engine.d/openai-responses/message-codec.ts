import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as VerbatimCodec from '../../verbatim/codec.ts';
import { ResponseInvalid } from '../../engine.ts';
import { Media } from '../../media.ts';

const NOMINAL = Symbol();


export class MessageCodec<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> {
    public constructor(protected ctx: MessageCodec.Context<fdm, vdm>) {}

    /**
     * @throws {@link VerbatimCodec.Request.Invalid}
     */
    public decodeAiMessage(
        output: OpenAI.Responses.ResponseOutputItem[],
    ): MessageCodec.Message.Ai.From<fdm, vdm> {
        const parts = output.flatMap(
            (item): RoleMessage.Ai.Part.From<fdm, vdm>[] => {
                if (item.type === 'message') {
                    if (item.content.every(part => part.type === 'output_text')) {} else
                        throw new ResponseInvalid('Refusal', { cause: output });
                    const text = item.content.map(part => part.text).join('');
                    if (text) try {
                        const vrs = VerbatimCodec.Request.decode(text, this.ctx.vdm);
                        return [new RoleMessage.Part.Text(text, vrs)];
                    } catch (e) {
                        if (e instanceof SyntaxError)
                            throw new ResponseInvalid('Invalid verbatim message', { cause: output });
                        else throw e;
                    } else return [];
                } else if (item.type === 'function_call')
                    return [this.ctx.toolCodec.decodeFunctionCall(item)];
                else if (item.type === 'reasoning')
                    return [];
                else throw new Error();
            },
        );
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
        const frs = userMessage.getFunctionResponses();
        responseInput.push(...frs.map(fr => this.ctx.toolCodec.encodeFunctionResponse(fr)));
        const content = userMessage.getParts().flatMap<OpenAI.Responses.ResponseInputContent>(part => {
            if (part instanceof RoleMessage.Part.Text)
                return [{
                    type: 'input_text',
                    text: part.text,
                } satisfies OpenAI.Responses.ResponseInputText];
            else if (part instanceof Function.Response) return [];
            else if (part instanceof Media.Image)
                return [{
                    type: 'input_image',
                    image_url: `data:${part.mimeType};base64,${part.base64}`,
                    detail: this.encodeImageResolution(part.resolution),
                } satisfies OpenAI.Responses.ResponseInputImage];
            else if (part instanceof Media.Pdf)
                return [{
                    type: 'input_file',
                    file_data: `data:${part.mimeType};base64,${part.base64}`,
                } satisfies OpenAI.Responses.ResponseInputFile];
            else throw new Error();
        });
        if (content.length) responseInput.push({
            type: 'message',
            role: 'user',
            content,
        });
        return responseInput;
    }

    public encodeAiMessage(
        aiMessage: RoleMessage.Ai.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseInput {
        if (aiMessage instanceof MessageCodec.Message.Ai)
            return aiMessage.getRaw().map(item => {
                if (item.type !== 'computer_call_output') return item;
                else throw new Error('Computer calls are not supported yet.');
            });
        else
            return aiMessage.getParts().map(part => {
                if (part instanceof RoleMessage.Part.Text)
                    return {
                        role: 'assistant',
                        content: part.text,
                    } satisfies OpenAI.Responses.EasyInputMessage;
                else if (part instanceof Function.Call)
                    return this.ctx.toolCodec.encodeFunctionCall(part);
                else throw new Error();
            });
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
    export interface Context<
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
