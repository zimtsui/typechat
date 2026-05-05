import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { MessageCodec } from './google/message-codec.ts';
import { ToolCodec } from './google/tool-codec.ts';
import { Billing } from './google/billing.ts';
import { env } from 'node:process';
import { Agent, ProxyAgent } from 'undici';
import { StructuringValidator } from '../engine/structuring-validator.ts';
import { Transport } from './google/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import * as MessageModule from './google/message.ts';


export type GoogleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = GoogleEngine.Instance<fdm, vdm>;
export namespace GoogleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;
        protected codeExecution: boolean;
        protected urlContext: boolean;
        protected googleSearch: boolean;

        public constructor(protected options: GoogleEngine.Options<fdm, vdm>) {
            super(options);

            this.codeExecution = options.codeExecution ?? false;
            this.urlContext = options.urlContext ?? false;
            this.googleSearch = options.googleSearch ?? false;

            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;
            this.providerSpecs.dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 0,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 0,
                    bodyTimeout: 0,
                });

            if (options.endpointSpec.parallelToolCall === false) throw new Error('Parallel tool calling is required by Google engine.');
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
                codeExecution: this.codeExecution,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                structuringChoice: this.structuringChoice,
                codeExecution: this.codeExecution,
                urlContext: this.urlContext,
                googleSearch: this.googleSearch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });

            this.structuringValidator = new StructuringValidator({ structuringChoice: this.structuringChoice });
        }

        public override clone(): GoogleEngine<fdm, vdm> {
            const engine = new GoogleEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

        protected override async infer(wfctx: InferenceContext, session: Engine.Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Engine.Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Engine.Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override useStateless(middleware: Middleware.From<fdm, vdm>): GoogleEngine<fdm, vdm> {
            return super.useStateless(middleware) as GoogleEngine<fdm, vdm>;
        }
        public override useStateful(middleware: Middleware.From<fdm, vdm>): GoogleEngine<fdm, vdm> {
            return super.useStateful(middleware) as GoogleEngine<fdm, vdm>;
        }

        /**
         * @param session mutable
         */
        public override async *agentloop(
            wfctx: InferenceContext,
            session: Engine.Session.From<fdm, vdm>,
            fnm: Function.Map<fdm>,
            vhm: Verbatim.Handler.Map<vdm>,
            limit = Number.POSITIVE_INFINITY,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
                if (response.allChatPart()) return response.getChatText();
                const pfress: Promise<Function.Response.From<fdm>>[] = [];
                const pvress: Promise<RoleMessage.User.Part.Text>[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof Engine.RoleMessage.Ai.Part.Text) {
                        const textPart = part as Engine.RoleMessage.Ai.Part.Text.From<vdm>;
                        yield textPart.text;
                        for (const vreq of textPart.vreqs) {
                            const vh = vhm[vreq.name];
                            pvress.push((async () => new RoleMessage.User.Part.Text(await vh.call(vhm, vreq.args)))());
                        }
                    } else if (part instanceof Function.Call) {
                        const fcall = part as Function.Call.From<fdm>;
                        const f = fnm[fcall.name];
                        pfress.push((async () => {
                            try {
                                return Function.Response.Successful.of({
                                    id: fcall.id,
                                    name: fcall.name,
                                    text: await f.call(fnm, fcall.args),
                                } as Function.Response.Successful.Options.From<fdm>);
                            } catch (e) {
                                if (e instanceof Function.Error) {} else throw e;
                                return Function.Response.Failed.of({
                                    id: fcall.id,
                                    name: fcall.name,
                                    error: e.message,
                                } as Function.Response.Failed.Options.From<fdm>);
                            }
                        })());
                    } else if (part instanceof RoleMessage.Ai.Part.ExecutableCode) {
                        yield RoleMessage.Ai.encodeChatPart(part);
                    } else if (part instanceof RoleMessage.Ai.Part.CodeExecutionResult) {
                        yield RoleMessage.Ai.encodeChatPart(part);
                    } else throw new Error();
                }
                const fress: Function.Response.From<fdm>[] = await Promise.all(pfress);
                const vress: RoleMessage.User.Part.Text[] = await Promise.all(pvress);
                session.chatMessages.push(new RoleMessage.User([...fress, ...vress]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }

    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        codeExecution?: boolean;
        urlContext?: boolean;
        googleSearch?: boolean;
    }

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(options: Engine.Options<fdm, vdm>): Engine<fdm, vdm> {
        return new Instance(options);
    }

    export import RoleMessage = MessageModule.RoleMessage;

}
