import { Function } from '../../function.ts';
import OpenAI from 'openai';
import type { InferenceContext } from '../../inference-context.ts';
import type { Verbatim } from '../../verbatim.ts';
import { type InferenceOptions, type ProviderSpecs, Engine } from '../../engine.ts';
import { loggers } from '../../telemetry.ts';
import type { Billing } from './billing.ts';
import type { ToolCodec } from './tool-codec.ts';
import { Throttle } from '../../throttle.ts';
import { type MessageCodec } from './message-codec.ts';
import type { StructuringChoice } from '../../structuring-choice.ts';
import * as StructuringChoiceCodec from './structuring-choice-codec.ts';
import * as Undici from 'undici';


export class Transport<
    in out fdm extends Function.Decl.Map.Proto,
    in out vdm extends Verbatim.Decl.Map.Proto,
> implements Engine.Transport<fdm, vdm> {
    protected client: OpenAI;
    protected inferenceParams: InferenceOptions;
    protected providerSpec: ProviderSpecs;
    protected fdm: fdm;
    protected throttle: Throttle;
    protected structuringChoice: StructuringChoice;
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
        this.messageCodec = options.messageCodec;
        this.toolCodec = options.toolCodec;
        this.billing = options.billing;
    }

    protected makeParams(
        session: Engine.Session.From<fdm, vdm>,
    ): OpenAI.ChatCompletionCreateParamsStreaming {
        const tools = this.toolCodec.encodeFunctionDeclarationMap();
        const messages: OpenAI.ChatCompletionMessageParam[] = [];
        if (session.developerMessage) messages.push(...this.messageCodec.encodeRoleMessage(session.developerMessage));
        messages.push(...this.messageCodec.encodeRoleMessages(session.chatMessages));
        return {
            model: this.inferenceParams.model,
            messages,
            tools: tools.length ? tools : undefined,
            tool_choice: tools.length ? StructuringChoiceCodec.encode(this.structuringChoice) : undefined,
            parallel_tool_calls: tools.length ? this.inferenceParams.parallelToolCall : undefined,
            stream: true,
            stream_options: {
                include_usage: true,
            },
            ...this.inferenceParams.additionalOptions,
        };
    }

    public mergeToolCall(
        apifc: OpenAI.ChatCompletionChunk.Choice.Delta.ToolCall,
    ): OpenAI.ChatCompletionMessageToolCall {
        if (apifc.id) {} else throw new Error();
        if (apifc.function?.name) {} else throw new SyntaxError('Function name missing.', { cause: apifc });
        if (apifc.function?.arguments) {} else throw new SyntaxError('Function arguments missing.', { cause: apifc });
        return {
            id: apifc.id,
            type: 'function',
            function: {
                name: apifc.function.name,
                arguments: apifc.function.arguments,
            },
        };
    }

    public mergeCompletion(
        stock: OpenAI.ChatCompletionChunk,
    ): OpenAI.ChatCompletion {
        const stockChoice = stock?.choices[0];
        if (stockChoice?.finish_reason) {} else throw new SyntaxError('Finish reason missing', { cause: stock });

        return {
            id: stock.id,
            object: 'chat.completion',
            created: stock.created,
            model: stock.model,
            choices: [{
                index: 0,
                finish_reason: stockChoice.finish_reason,
                message: {
                    role: 'assistant',
                    content: stockChoice.delta.content ?? null,
                    tool_calls: stockChoice.delta.tool_calls?.map(
                        apifc => this.mergeToolCall(apifc),
                    ),
                    refusal: stockChoice.delta.refusal ?? null,
                },
                logprobs: stockChoice.logprobs ?? null,
            }],
            usage: stock.usage ?? undefined,
        };
    }

    public async fetch(
        wfctx: InferenceContext,
        session: Engine.Session.From<fdm, vdm>,
        signal?: AbortSignal,
    ): Promise<Engine.RoleMessage.Ai.From<fdm, vdm>> {
        try {
            await this.throttle.requests(wfctx);

            const params = this.makeParams(session);
            loggers.message.debug(params);

            const stream = await this.client.chat.completions.create(params, { signal });

            let stock: OpenAI.ChatCompletionChunk | null = null;
            for await (const chunk of stream) {
                loggers.stream.trace(chunk);

                stock ??= {
                    id: chunk.id,
                    created: chunk.created,
                    model: chunk.model,
                    choices: [],
                    object: 'chat.completion.chunk',
                };

                const deltaChoice = chunk.choices[0];
                if (deltaChoice) {
                    if (!stock.choices.length)
                        stock.choices.push({
                            index: 0,
                            finish_reason: null,
                            delta: {},
                        });

                    if (deltaChoice.delta.content) {
                        stock.choices[0]!.delta.content ??= '';
                        stock.choices[0]!.delta.content! += deltaChoice.delta.content;
                    }

                    if (deltaChoice.delta.tool_calls) {
                        stock.choices[0]!.delta.tool_calls ??= [];
                        for (const deltaToolCall of deltaChoice.delta.tool_calls) {
                            const toolCalls = stock.choices[0]!.delta.tool_calls!;
                            toolCalls[deltaToolCall.index] ??= { index: deltaToolCall.index };
                            toolCalls[deltaToolCall.index]!.id ??= deltaToolCall.id;
                            if (deltaToolCall.function) {
                                toolCalls[deltaToolCall.index]!.function ??= {};
                                toolCalls[deltaToolCall.index]!.function!.name ??= deltaToolCall.function.name;
                                if (deltaToolCall.function.arguments) {
                                    toolCalls[deltaToolCall.index]!.function!.arguments ??= '';
                                    toolCalls[deltaToolCall.index]!.function!.arguments! += deltaToolCall.function?.arguments || '';
                                }
                            }
                        }
                    }

                    stock.choices[0]!.finish_reason ??= deltaChoice.finish_reason;
                }

                stock.usage ??= chunk.usage;
            }

            if (stock) {} else throw new Error();
            const completion = this.mergeCompletion(stock);
            loggers.message.debug(completion);

            const choice = completion.choices[0];
            if (choice) {} else throw new SyntaxError('Content missing', { cause: completion });
            if (choice.message.content) loggers.inference.info(choice.message.content);

            if (choice.finish_reason === 'length') throw new SyntaxError('Token limit exceeded.', { cause: completion });
            if (['stop', 'tool_calls'].includes(choice.finish_reason)) {}
            else throw new SyntaxError('Abnormal finish reason', { cause: choice.finish_reason });

            if (completion.usage) {} else throw new Error();
            const cost = this.billing.charge(completion.usage);

            if (choice.message.tool_calls) loggers.message.info(choice.message.tool_calls);
            loggers.message.info(completion.usage);
            wfctx.cost?.(cost);

            return this.messageCodec.decodeAiMessage(choice.message);
        } catch (e) {
            if (e instanceof OpenAI.InternalServerError)
                throw new TypeError('OpenAI internal server error', { cause: e });
            else if (e instanceof OpenAI.APIConnectionError)
                throw new TypeError('OpenAI API connection error', { cause: e });
            else throw e;
        }
    }
}

export namespace Transport {
    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        inferenceParams: InferenceOptions;
        providerSpec: ProviderSpecs;
        fdm: fdm;
        throttle: Throttle;
        structuringChoice: StructuringChoice;
        messageCodec: MessageCodec<fdm, vdm>;
        toolCodec: ToolCodec<fdm>;
        billing: Billing;
    }
}
