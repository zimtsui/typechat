import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import Anthropic from '@anthropic-ai/sdk';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { Billing } from '../../api-types/anthropic/billing.ts';
import type { ToolCodec } from '../../api-types/anthropic/tool-codec.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from './choice-codec.ts';
import type { Structuring } from '../../compatible-engine/structuring.ts';
import type { Engine } from '../../engine.ts';
import * as Undici from 'undici';


export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<
    RoleMessage.User.From<fdm>,
    RoleMessage.Ai.From<fdm, vdm>,
    RoleMessage.Developer,
    Session.From<fdm, vdm>
> {
    protected client: Anthropic;
    protected providerSpec: ProviderSpec;
    protected inferenceSpec: InferenceParams;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected structuringChoice: Structuring.Choice.From<fdm, vdm>;
    protected messageCodec: MessageCodec<fdm, vdm>;
    protected toolCodec: ToolCodec<fdm>;
    protected billing: Billing;

    public constructor(options: Transport.Options<fdm, vdm>) {
        this.client = new Anthropic({
            baseURL: options.providerSpec.baseUrl,
            apiKey: options.providerSpec.apiKey,
            fetch: Undici.fetch as typeof globalThis.fetch,
            fetchOptions: { dispatcher: options.providerSpec.dispatcher },
        });
        this.providerSpec = options.providerSpec;
        this.inferenceSpec = options.inferenceSpec;
        this.fdm = options.fdm;
        this.throttle = options.throttle;
        this.structuringChoice = options.choice;
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): Anthropic.MessageCreateParamsStreaming {
        const tools = this.toolCodec.encodeFunctionDeclarationMap(this.fdm);
        return {
            model: this.inferenceSpec.model,
            stream: true,
            messages: session.chatMessages.map(chatMessage => this.messageCodec.encodeChatMessage(chatMessage)),
            system: session.developerMessage && this.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.structuringChoice, this.inferenceSpec.parallelToolCall) : undefined,
            max_tokens: 64 * 1024,
            ...this.inferenceSpec.additionalOptions,
        };
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm, vdm>> {
        await this.throttle.requests(wfctx);

        // Prepare request
        const params = this.makeParams(session);
        loggers.message.debug(params);

        // Send request
        const stream = this.client.messages.stream(
            params,
            {
                signal,
                fetchOptions: { dispatcher: this.providerSpec.dispatcher },
            },
        );

        // Get response
        let response: Anthropic.Message | null = null;
        for await (const event of stream) {
            loggers.stream.trace(event);
            if (event.type === 'message_start') {
                response = structuredClone(event.message);
            } else {
                if (response) {} else throw new Error();
                if (event.type === 'message_delta') {
                    response.stop_sequence = event.delta.stop_sequence ?? response.stop_sequence;
                    response.stop_reason = event.delta.stop_reason ?? response.stop_reason;
                    response.usage.input_tokens = event.usage.input_tokens ?? response.usage.input_tokens;
                    response.usage.output_tokens = event.usage.output_tokens;
                    response.usage.cache_read_input_tokens = event.usage.cache_read_input_tokens ?? response.usage.cache_read_input_tokens;
                    response.usage.cache_creation_input_tokens = event.usage.cache_creation_input_tokens ?? response.usage.cache_creation_input_tokens;
                    response.usage.server_tool_use = event.usage.server_tool_use ?? response.usage.server_tool_use;
                } else if (event.type === 'message_stop') {
                } else if (event.type === 'content_block_start') {
                    const contentBlock = structuredClone(event.content_block);
                    response.content.push(contentBlock);
                    if (contentBlock.type === 'tool_use') contentBlock.input = '';
                } else if (event.type === 'content_block_delta') {
                    const contentBlock = response.content[event.index];
                    if (event.delta.type === 'text_delta') {
                        if (contentBlock?.type === 'text') {} else throw new Error();
                        contentBlock.text += event.delta.text;
                    } else if (event.delta.type === 'thinking_delta') {
                        if (contentBlock?.type === 'thinking') {} else throw new Error();
                        contentBlock.thinking += event.delta.thinking;
                    } else if (event.delta.type === 'signature_delta') {
                        if (contentBlock?.type === 'thinking') {} else throw new Error();
                        contentBlock.signature += event.delta.signature;
                    } else if (event.delta.type === 'input_json_delta') {
                        if (contentBlock?.type === 'tool_use') {} else throw new Error();
                        if (typeof contentBlock.input === 'string') {} else throw new Error();
                        contentBlock.input += event.delta.partial_json;
                    } else throw new Error('Unknown type of content block delta', { cause: event.delta });
                } else if (event.type === 'content_block_stop') {
                    const contentBlock = response.content[event.index];
                    if (contentBlock?.type === 'text') loggers.inference.info(contentBlock.text);
                    else if (contentBlock?.type === 'thinking') loggers.inference.debug(contentBlock.thinking);
                    if (contentBlock?.type === 'tool_use') {
                        if (typeof contentBlock.input === 'string') {} else throw new Error();
                        try {
                            contentBlock.input = JSON.parse(contentBlock.input);
                        } catch (e) {
                            throw new SyntaxError('Invalid JSON of tool use input', { cause: contentBlock.input });
                        }
                        loggers.message.info(contentBlock);
                    }
                } else throw new Error('Unknown stream event', { cause: event });
            }
        }

        // Validate response
        if (response) {} else throw new Error();
        if (response.stop_reason === 'max_tokens')
            throw new SyntaxError('Token limit exceeded.', { cause: response });
        if (response.stop_reason === 'end_turn' || response.stop_reason === 'tool_use') {} else
            throw new SyntaxError('Abnormal stop reason', { cause: response });
        loggers.message.info(response.usage);
        wfctx.cost?.(this.billing.charge(response.usage));

        return this.messageCodec.decodeAiMessage(response.content);
    }
}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        providerSpec: ProviderSpec;
        inferenceSpec: InferenceParams;
        fdm: fdm;
        throttle: Throttle;
        choice: Structuring.Choice.From<fdm, vdm>;

        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
