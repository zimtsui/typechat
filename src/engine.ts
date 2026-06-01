import { Function } from './function.ts';
import { EndpointSpec } from './endpoint-spec.ts';
import { Throttle } from './throttle.ts';
import * as Undici from 'undici';
import { env } from 'node:process';
import { type InferenceContext } from './inference-context.ts';
import { loggers } from './telemetry.ts';
import * as SessionModule from './engine/session.ts';
import * as MessageModule from './engine/message.ts';
import { PartsValidator } from './engine/parts-validator.ts';
import * as ExceptionsModule from './engine/exceptions.ts';
import * as MiddlewareModule from './engine/middleware.ts';
import * as ToolChoiceValidatorModule from './engine/tool-choice-validator.ts';
import * as TransportModule from './engine/transport.ts';
import { ToolChoice } from './tool-choice.ts';
import { Text } from './text.ts';


export interface Pricing {
    inputPrice: number;
    cachePrice: number;
    outputPrice: number;
}
export interface ProviderSpecs {
    baseUrl: string;
    apiKey: string;
    dispatcher: Undici.Dispatcher;
    retry: number;
}
export interface InferenceOptions {
    model: string;
    additionalHeaders?: Record<string, string>;
    additionalOptions?: Record<string, unknown>;
    parallelToolCall?: boolean;
    timeout?: number;
    retry: number;
}

export type Engine<
    fdm extends Function.Decl.Map.Proto,
> = Engine.Instance<fdm>;
export namespace Engine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        protected providerSpecs: ProviderSpecs;
        protected inferenceOptions: InferenceOptions;
        public name: string;
        public pricing: Pricing;
        public fdm: fdm;
        protected throttle: Throttle;
        protected toolChoice: ToolChoice;
        protected toolChoiceValidator: Engine.ToolChoiceValidator.From<fdm>;
        protected partsValidator: PartsValidator.From<fdm>;
        protected abstract transport: Engine.Transport<fdm>;

        public constructor(options: Engine.Options<fdm>) {
            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;

            const dispatcher = proxyUrl
                ? new Undici.ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 0,
                    bodyTimeout: 0,
                })
                : new Undici.Agent({
                    headersTimeout: 0,
                    bodyTimeout: 0,
                });
            this.providerSpecs = {
                baseUrl: options.endpointSpec.baseUrl,
                apiKey: options.endpointSpec.apiKey,
                dispatcher,
                retry: options.providerRetry ?? 2,
            };

            this.name = options.endpointSpec.name;
            this.inferenceOptions = {
                model: options.endpointSpec.model,
                additionalHeaders: options.endpointSpec.additionalHeaders,
                additionalOptions: options.endpointSpec.additionalOptions,
                timeout: options.endpointSpec.timeout,
                parallelToolCall: options.endpointSpec.parallelToolCall,
                retry: options.inferenceRetry ?? 2,
            };

            this.pricing = {
                inputPrice: options.endpointSpec.inputPrice ?? 0,
                outputPrice: options.endpointSpec.outputPrice ?? 0,
                cachePrice: options.endpointSpec.cachePrice ?? options.endpointSpec.inputPrice ?? 0,
            };
            this.fdm = options.functionDeclarationMap;
            this.toolChoice = options.toolChoice ?? ToolChoice.AUTO;
            this.throttle = options.throttle;
            this.partsValidator = new PartsValidator();
            this.toolChoiceValidator = new ToolChoiceValidator({ toolChoice: this.toolChoice });
        }

        /**
         * @throws {@link Exceptions.InferenceTimeout} 推理超时
         * @throws {@link Exceptions.InferenceError} 模型抽风
         * @throws {@link Exceptions.Recoverable} 模型抽风但可恢复
         * @throws {@link Exceptions.ConnectionError} 网络故障
         */
        protected async infer(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
        ): Promise<Message.Output.From<fdm>> {
            const signalTimeout = this.inferenceOptions.timeout ? AbortSignal.timeout(this.inferenceOptions.timeout) : null;
            const signals: AbortSignal[] = [];
            if (signalTimeout) signals.push(signalTimeout);
            if (wfctx.signal) signals.push(wfctx.signal);
            const signal = AbortSignal.any(signals);
            try {
                const aiMessage = await this.transport.fetch(wfctx, session, signal);
                this.partsValidator.validate(aiMessage);
                const rejection = this.toolChoiceValidator.validate(aiMessage);
                if (rejection) throw new Exceptions.InferenceError.Recoverable(aiMessage, rejection);
                return aiMessage;
            } catch (e) {
                if (signalTimeout?.aborted)
                    throw new Exceptions.InferenceTimeout(undefined, { cause: e });
                else if (wfctx.signal?.aborted)
                    throw wfctx.signal.reason;
                else throw e;
            }
        }

        /**
        * @throws {@link Exceptions.InferenceTimeout} 推理超时
        * @throws {@link Exceptions.InferenceError} 模型抽风
        * @throws {@link Exceptions.ConnectionError} 网络故障
        */
        public async stateless(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
        ): Promise<Message.Output.From<fdm>> {
            const middleware = this.compose(this.middlewaresStateless);
            for (let retryProvider = 0, retryInference = 0;;) try {
                return await middleware(wfctx, session, () => this.infer(wfctx, session));
            } catch (e) {
                if (e instanceof Exceptions.InferenceTimeout) {
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof Exceptions.InferenceError) {
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof Exceptions.ConnectionError) {
                    if (retryProvider < this.providerSpecs.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        /**
        * @throws {@link Exceptions.InferenceTimeout} 推理超时
        * @throws {@link Exceptions.InferenceError} 模型抽风
        * @throws {@link Exceptions.ConnectionError} 网络故障
        * @param session mutable
        */
        public async stateful(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
        ): Promise<Message.Output.From<fdm>> {
            const middleware = this.compose(this.middlewaresStateful);
            for (let retryProvider = 0, retryInference = 0;;) try {
                const next = async () => {
                    const aiMessage = await this.infer(wfctx, session);
                    session.chatMessages.push(aiMessage);
                    return aiMessage;
                }
                return await middleware(wfctx, session, next);
            } catch (e) {
                if (e instanceof Exceptions.InferenceTimeout) {
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof Exceptions.InferenceError) {
                    if (retryInference < this.inferenceOptions.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof Exceptions.ConnectionError) {
                    if (retryProvider < this.providerSpecs.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        public abstract clone(): Engine<fdm>;

        protected middlewaresStateless: Middleware.From<fdm>[] = [];
        public useStateless(middleware: Middleware.From<fdm>): Engine<fdm> {
            const engine = this.clone();
            engine.middlewaresStateless.push(middleware);
            return engine;
        }
        protected middlewaresStateful: Middleware.From<fdm>[] = [];
        public useStateful(middleware: Middleware.From<fdm>): Engine<fdm> {
            const engine = this.clone();
            engine.middlewaresStateful.push(middleware);
            return engine;
        }
        protected compose(middlewares: Middleware.From<fdm>[]): Middleware.From<fdm> {
            let composed: Middleware.From<fdm> = (wfctx, session, next) => next();
            for (const middleware of middlewares.slice().reverse()) {
                const nextMiddleware = composed;
                composed = (wfctx, session, next) => middleware(wfctx, session, () => nextMiddleware(wfctx, session, next));
            }
            return composed;
        }

        /**
         * @param session mutable
         */
        public async *agentloop(
            wfctx: InferenceContext,
            session: Session.From<fdm>,
            fnm: Function.Map<fdm>,
            limit = Number.POSITIVE_INFINITY,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session);
                if (response.allTextParts()) return response.joinText();
                const frs: Function.Response.From<fdm>[] = [];
                for (const part of response.parts) {
                    if (part instanceof Text) {
                        yield part.raw;
                    } else if (part instanceof Function.Call) {
                        const fc = part as Function.Call.From<fdm>;
                        const f = fnm[fc.name];
                        try {
                            const frparts = await f.call(fnm, fc.args, fc);
                            frs.push(
                                Function.Response.Successful.of({
                                    id: fc.id,
                                    name: fc.name,
                                    parts: frparts,
                                } as Function.Response.Successful.Options.From<fdm>),
                            );
                        } catch (e) {
                            if (e instanceof Function.Error) {} else throw e;
                            const fr = Function.Response.Failed.of({
                                id: fc.id,
                                name: fc.name,
                                error: e.message,
                            } as Function.Response.Failed.Options.From<fdm>);
                            frs.push(fr);
                        }
                    } else throw new Error();
                }
                session.chatMessages.push(new Message.Input([...frs]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }

    }

    export class FunctionCallLimitExceeded extends Error {}

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > {
        throttle: Throttle;
        endpointSpec: EndpointSpec;
        functionDeclarationMap: fdm;
        toolChoice?: ToolChoice;
        providerRetry?: number;
        inferenceRetry?: number;
    }

    export interface Create {
        <
            fdm extends Function.Decl.Map.Proto,
        >(options: Engine.Options<fdm>): Engine<fdm>;
    }

    export import Transport = TransportModule.Transport;
    export import ToolChoiceValidator = ToolChoiceValidatorModule.ToolChoiceValidator;
    export import Session = SessionModule.Session;
    export import Message = MessageModule.Message;
    export import Exceptions = ExceptionsModule;
    export import Middleware = MiddlewareModule.Middleware;
}

declare global {
    export namespace NodeJS {
        export interface ProcessEnv {
            https_proxy?: string;
        }
    }
}
