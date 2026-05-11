import { type InferenceOptions, type ProviderSpecs } from '../../engine.ts';
import { type Session } from '../../engine/session.ts';
import { RoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from '../openai-responses/tool-codec.ts';
import type { Billing } from '../openai-responses/billing.ts';
import * as ToolChoiceCodec from './tool-choice-codec.ts';
import { ToolChoice } from '../../tool-choice.ts';
import { Engine } from "../../engine.js";
import * as Undici from 'undici';
import assert from 'node:assert';



export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
> implements Engine.Transport<fdm> {
    protected client: OpenAI;
    protected inferenceParams: InferenceOptions;
    protected providerSpec: ProviderSpecs;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected toolChoice: ToolChoice;
    protected messageCodec: MessageCodec<fdm>;
    protected toolCodec: ToolCodec<fdm>;
    protected billing: Billing;

    public constructor(options: Transport.Options<fdm>) {
        this.client = new OpenAI({
            baseURL: options.providerSpec.baseUrl,
            apiKey: options.providerSpec.apiKey,
            fetch: Undici.fetch as typeof globalThis.fetch,
            fetchOptions: { dispatcher: options.providerSpec.dispatcher },
            defaultHeaders: new Headers({
                'X-Dashscope-Session-Cache': 'enable',
            }),
        });
        this.inferenceParams = options.inferenceParams;
        this.providerSpec = options.providerSpec;
        this.fdm = options.fdm;
        this.throttle = options.throttle;
        this.toolChoice = options.toolChoice;
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    protected makeParams(
        session: Session.From<fdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools: OpenAI.Responses.Tool[] = this.toolCodec.encodeFunctionDeclarationMap();
        let input: OpenAI.Responses.ResponseInput;
        let previous_response_id: string | undefined = undefined;
        let instructions: string | undefined = undefined;
        const lastSecondMessage = session.chatMessages.at(-2);
        if (lastSecondMessage instanceof RoleMessage.Ai) {
            const lastMessage = session.chatMessages.at(-1);
            assert(lastMessage instanceof Engine.RoleMessage.User);
            input = this.messageCodec.encodeUserMessage(lastMessage);
            previous_response_id = lastSecondMessage.getRaw().id;
        } else {
            input = session.chatMessages.flatMap(chatMessage => this.messageCodec.encodeChatMessage(chatMessage));
            instructions = session.developerMessage && this.messageCodec.encodeDeveloperMessage(session.developerMessage);
        }
        return {
            model: this.inferenceParams.model,
            include: ['reasoning.encrypted_content'],
            store: true,
            stream: true,
            input,
            previous_response_id,
            instructions,
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ToolChoiceCodec.encode(this.toolChoice) : undefined,
            parallel_tool_calls: tools.length ? this.inferenceParams.parallelToolCall : undefined,
            ...this.inferenceParams.additionalOptions,
        };
    }

    protected logAiMessage(output: OpenAI.Responses.ResponseOutputItem[]): void {
        for (const item of output)
            if (item.type === 'message') {
                if (item.content.every(part => part.type === 'output_text')) {} else
                    throw new SyntaxError('Refusal', { cause: output });
                loggers.inference.info(item.content.map(part => part.text).join(''));
            } else if (item.type === 'function_call')
                loggers.message.info(item);
            else if (item.type === 'apply_patch_call')
                loggers.message.info(item);
            else if (item.type === 'reasoning') {}
            else loggers.message.info(item);
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Session.From<fdm>,
        signal?: AbortSignal,
    ): Promise<RoleMessage.Ai.From<fdm>> {
        await this.throttle.requests(wfctx);

        const params = this.makeParams(session);
        loggers.message.debug(params);

        let response: OpenAI.Responses.Response | null = null;
        const stream = await this.client.responses.create(params, { signal });
        for await (const event of stream) {
            loggers.stream.trace(event);
            if (event.type === 'response.completed')
                response = event.response;
            else if (event.type === 'response.incomplete')
                response = event.response;
            else if (event.type === 'response.failed')
                response = event.response;
            else if (event.type === 'error')
                throw new SyntaxError('Response stream error', { cause: event });
        }

        if (response) {} else throw new Error();
        loggers.message.debug(response);
        if (response.status === 'completed') {} else
            throw new SyntaxError('Abnormal response status', { cause: response });
        if (response.usage) {} else throw new Error();

        this.logAiMessage(response.output);
        wfctx.cost?.(this.billing.charge(response.usage));
        loggers.message.info(response.usage);

        return this.messageCodec.decodeAiMessage(response);
    }
}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        inferenceParams: InferenceOptions;
        providerSpec: ProviderSpecs;
        fdm: fdm;
        throttle: Throttle;
        toolChoice: ToolChoice;
        messageCodec: MessageCodec<fdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
