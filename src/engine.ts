import { Function } from './function.ts';
import { EndpointSpec } from './endpoint-spec.ts';
import { Throttle } from './throttle.ts';
import { Agent, ProxyAgent, Dispatcher } from 'undici';
import { env } from 'node:process';
import { type InferenceContext } from './inference-context.ts';
import { loggers } from './telemetry.ts';
import * as SessionModule from './engine/session.ts';
import { Verbatim } from "./verbatim.js";
import * as ValidationModule from './engine/validation.ts';
import * as TransportModule from './engine/transport.ts';


export interface Pricing {
    inputPrice: number;
    cachePrice: number;
    outputPrice: number;
}
export interface ProviderSpec {
    baseUrl: string;
    apiKey: string;
    dispatcher: Dispatcher;
    retry: number;
}
export interface InferenceParams {
    model: string;
    additionalOptions?: Record<string, unknown>;
    parallelToolCall?: boolean;
    timeout?: number;
    retry: number;
}

export type Engine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
    userm, aim, devm,
    session extends Engine.Session<userm, aim, devm>,
> = Engine.Instance<fdm, vdm, userm, aim, devm, session>;
export namespace Engine {
    export abstract class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
        in out userm, in out aim, in out devm,
        in out session extends Engine.Session<userm, aim, devm>,
    > {
        protected providerSpec: ProviderSpec;
        protected inferenceParams: InferenceParams;
        public name: string;
        public pricing: Pricing;
        public fdm: fdm;
        public vdm: vdm;
        protected throttle: Throttle;
        protected abstract structuringValidator: Engine.StructuringValidator<userm, aim>;
        protected abstract partsValidator: Engine.PartsValidator<aim>;
        protected abstract transport: Engine.Transport<userm, aim, devm, session>;

        public constructor(options: Engine.Options<fdm, vdm>) {
            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;

            const dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 10000,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 10000,
                    bodyTimeout: 0,
                });
            this.providerSpec = {
                baseUrl: options.endpointSpec.baseUrl,
                apiKey: options.endpointSpec.apiKey,
                dispatcher,
                retry: options.providerRetry ?? 2,
            };

            this.name = options.endpointSpec.name;
            this.inferenceParams = {
                model: options.endpointSpec.model,
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
            this.vdm = options.verbatimDeclarationMap;
            this.throttle = options.throttle;
        }

        /**
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link Recoverable} 模型抽风但可恢复
        * @throws {@link TypeError} 网络故障
        */
        protected async infer(
            wfctx: InferenceContext,
            session: session,
        ): Promise<aim> {
            const signalTimeout = this.inferenceParams.timeout ? AbortSignal.timeout(this.inferenceParams.timeout) : null;
            const signals: AbortSignal[] = [];
            if (signalTimeout) signals.push(signalTimeout);
            if (wfctx.signal) signals.push(wfctx.signal);
            const signal = AbortSignal.any(signals);
            try {
                const aiMessage = await this.transport.fetch(wfctx, session, signal);
                this.partsValidator.validate(aiMessage);
                const rejection = this.structuringValidator.validate(aiMessage);
                if (rejection) throw new Recoverable(aiMessage, rejection);
                return aiMessage;
            } catch (e) {
                if (signalTimeout?.aborted)
                    throw new InferenceTimeout(undefined, { cause: e });
                else throw e;
            }
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link TypeError} 网络故障
        */
        public async stateless(
            wfctx: InferenceContext,
            session: session,
        ): Promise<aim> {
            const middleware = this.compose(this.middlewares);
            for (let retryProvider = 0, retryInference = 0;;) try {
                const next = () => this.infer(wfctx, session);
                return await middleware(wfctx, session, next);
            } catch (e) {
                if (e instanceof InferenceTimeout) {    // 推理超时
                    if (retryInference < this.inferenceParams.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof SyntaxError) {  // 模型抽风
                    if (retryInference < this.inferenceParams.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof TypeError) {    // 网络故障
                    if (retryProvider < this.providerSpec.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        /**
        * @throws {@link InferenceTimeout} 推理超时
        * @throws {@link SyntaxError} 模型抽风
        * @throws {@link TypeError} 网络故障
        * @param session mutable
        */
        public async stateful(
            wfctx: InferenceContext,
            session: session,
        ): Promise<aim> {
            const middleware = this.compose(this.middlewares);
            const statefulMiddleware = this.compose(this.statefulMiddlewares);
            for (let retryProvider = 0, retryInference = 0;;) try {
                const next = () => this.infer(wfctx, session);
                const statefulNext = async () => {
                    const aiMessage = await middleware(wfctx, session, next);
                    session.chatMessages.push(aiMessage);
                    return aiMessage;
                }
                return await statefulMiddleware(wfctx, session, statefulNext);
            } catch (e) {
                if (e instanceof InferenceTimeout) {    // 推理超时
                    if (retryInference < this.inferenceParams.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof SyntaxError) {  // 模型抽风
                    if (retryInference < this.inferenceParams.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryInference++;
                } else if (e instanceof TypeError) {    // 网络故障
                    if (retryProvider < this.providerSpec.retry) {} else throw e;
                    loggers.message.warn(e);
                    retryProvider++;
                } else throw e;
            }
        }

        public abstract appendUserMessage(
            session: session,
            message: userm,
        ): session;

        /**
        * @param session mutable
        */
        public abstract pushUserMessage(
            session: session,
            message: userm,
        ): session;

        public abstract clone(): Engine<fdm, vdm, userm, aim, devm, session>;

        protected middlewares: Middleware<userm, aim, devm, session>[] = [];
        public use(middleware: Middleware<userm, aim, devm, session>): Engine<fdm, vdm, userm, aim, devm, session> {
            const engine = this.clone() as ReturnType<typeof this['clone']>;
            engine.middlewares.push(middleware);
            return engine;
        }
        protected statefulMiddlewares: Middleware<userm, aim, devm, session>[] = [];
        public statefulUse(middleware: Middleware<userm, aim, devm, session>): ReturnType<typeof this['clone']> {
            const engine = this.clone() as ReturnType<typeof this['clone']>;
            engine.statefulMiddlewares.push(middleware);
            return engine;
        }
        protected compose(middlewares: Middleware<userm, aim, devm, session>[], i: number = 0): Middleware<userm, aim, devm, session> {
            if (i < middlewares.length)
                return async (wfctx, session, next) => {
                    const middleware = middlewares[i]!;
                    const nextMiddlewares = this.compose(middlewares, i+1);
                    return middleware(wfctx, session, () => nextMiddlewares(wfctx, session, next));
                };
            else
                return (wfctx, session, next) => next();
        }
    }

    export interface Middleware<
        userm, aim, devm,
        session extends Engine.Session<userm, aim, devm>
    > {
        (wfctx: InferenceContext, session: session, next: () => Promise<aim>): Promise<aim>;
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > {
        throttle: Throttle;
        endpointSpec: EndpointSpec;
        functionDeclarationMap: fdm;
        verbatimDeclarationMap: vdm;
        providerRetry?: number;
        inferenceRetry?: number;
    }


    export import Session = SessionModule.Session;
    export import RoleMessage = SessionModule.RoleMessage;
    export import StructuringValidator = ValidationModule.StructuringValidator;
    export import PartsValidator = ValidationModule.PartsValidator;
    export import Transport = TransportModule.Transport;
}

export class InferenceTimeout extends Error {}
export class Recoverable<userm, aim> extends SyntaxError {
    public constructor(
        protected response: aim,
        protected rejection: userm,
        ...rest: ConstructorParameters<typeof SyntaxError>
    ) {
        super(...rest);
    }
    public resume(): aim {
        return this.response;
    }
    public recover(): userm {
        return this.rejection;
    }

    public static async recover<
        userm, aim, devm,
        session extends Engine.Session<userm, aim, devm>
    >(wfctx: InferenceContext, session: session, next: () => Promise<aim>): Promise<aim> {
        try {
            return await next();
        } catch (e) {
            if (e instanceof Recoverable) {} else throw e;
            session.chatMessages.push(e.resume(), e.recover());
            throw e;
        }
    }
}

declare global {
    export namespace NodeJS {
        export interface ProcessEnv {
            https_proxy?: string;
        }
    }
}
