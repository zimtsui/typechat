import { type InferenceParams, type ProviderSpec } from '../../engine.ts';
import { type Session } from '../../session.ts';
import { NativeRoleMessage } from './message.ts';
import { Function } from '../../function.ts';
import OpenAI from 'openai';
import { type InferenceContext } from '../../inference-context.ts';
import { Throttle } from '../../throttle.ts';
import { loggers } from '../../telemetry.ts';
import type { MessageCodec } from './message-codec.ts';
import type { ToolCodec } from './tool-codec.ts';
import type { Billing } from './billing.ts';
import type { Verbatim } from '../../verbatim.ts';
import * as ChoiceCodec from './choice-codec.ts';
import { StructuringChoice } from '../../engine/structuring-choice.ts';
import type { Engine } from '../../engine.ts';
import * as Undici from 'undici';


export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<fdm, vdm> {
    protected client: OpenAI;
    protected inferenceParams: InferenceParams;
    protected providerSpec: ProviderSpec;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected structuringChoice: StructuringChoice.From<fdm, vdm>;
    protected applyPatch: boolean;
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
        this.structuringChoice = options.structuringChoice;
        this.applyPatch = options.applyPatch;
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    protected makeParams(
        session: Session.From<fdm, vdm>,
    ): OpenAI.Responses.ResponseCreateParamsStreaming {
        const tools: OpenAI.Responses.Tool[] = this.toolCodec.encodeFunctionDeclarationMap();
        if (this.applyPatch) tools.push({ type: 'apply_patch' });
        return {
            model: this.inferenceParams.model,
            include: ['reasoning.encrypted_content'],
            store: false,
            stream: true,
            input: session.chatMessages.flatMap(chatMessage => this.messageCodec.encodeChatMessage(chatMessage)),
            instructions: session.developerMessage && this.messageCodec.encodeDeveloperMessage(session.developerMessage),
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? ChoiceCodec.encode(this.structuringChoice) : undefined,
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
        session: Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<NativeRoleMessage.Ai.From<fdm, vdm>> {
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
        structuringChoice: StructuringChoice.From<fdm, vdm>;
        applyPatch: boolean;
        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
