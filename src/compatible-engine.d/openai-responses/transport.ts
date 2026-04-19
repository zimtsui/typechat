import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { RoleMessage, type Session } from '../../compatible-engine/session.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from '../../api-types/openai-responses/tool-codec.ts';
import type { Billing } from '../../api-types/openai-responses/billing.ts';
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
    protected client: OpenAI;inferenceParams: InferenceParams;
    protected providerSpec: ProviderSpec;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected choice: Structuring.Choice.From<fdm, vdm>;
    protected messageCodec: MessageCodec<fdm, vdm>;
    protected toolCodec: ToolCodec<fdm>;
    protected billing: Billing;

    public constructor(options: Transport.Options<fdm, vdm>) {
        this.client = new OpenAI({
            baseURL: options.providerSpec.baseUrl,
            apiKey: options.providerSpec.apiKey,
            fetch: Undici.fetch as typeof globalThis.fetch,
            fetchOptions: { dispatcher: options.providerSpec.dispatcher },
        });
        this.inferenceParams = options.inferenceParams;
        this.providerSpec = options.providerSpec;
        this.fdm = options.fdm;
        this.throttle = options.throttle;
        this.choice = options.choice;
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools = this.toolCodec.encodeFunctionDeclarationMap(this.fdm);
        return {
            model: this.inferenceParams.model,
            include: ['reasoning.encrypted_content'],
            store: false,
            stream: true,
            input: session.chatMessages.flatMap(chatMessage => this.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.choice) : undefined,
            parallel_tool_calls: tools.length ? this.inferenceParams.parallelToolCall : undefined,
            ...this.inferenceParams.additionalOptions,
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

        // Validate response
        if (response) {} else throw new Error();
        loggers.message.debug(response);
        if (response.status === 'completed') {} else
            throw new SyntaxError('Abnormal response status', { cause: response });
        if (response.usage) {} else throw new Error();

        // Log response
        for (const item of response.output)
            if (item.type === 'message')
                for (const part of item.content)
                    if (part.type === 'output_text')
                        loggers.inference.info(part.text);
                    else if (part.type === 'refusal')
                        loggers.inference.warn(part.refusal);
            else loggers.message.info(item);
        loggers.message.info(response.usage);
        wfctx.cost?.(this.billing.charge(response.usage));

        return this.messageCodec.decodeAiMessage(response.output);
    }
}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        inferenceParams: InferenceParams;
        providerSpec: ProviderSpec;
        fdm: fdm;
        throttle: Throttle;
        choice: Structuring.Choice.From<fdm, vdm>;

        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
