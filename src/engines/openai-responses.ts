import { Engine, Middleware } from '../engine.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import { StructuringValidator } from '../engine/structuring-validator.ts';
import { Transport } from './openai-responses/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import { Session } from '../engine/session.ts';
import * as MessageModule from './openai-responses/message.ts';
import * as ToolModule from './openai-responses/tool.ts';


export type OpenAIResponsesEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIResponsesEngine.Instance<fdm, vdm>;
export namespace OpenAIResponsesEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;
        protected applyPatch: boolean;

        public constructor(protected options: OpenAIResponsesEngine.Options<fdm, vdm>) {
            super(options);
            this.applyPatch = options.applyPatch ?? false;

            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                structuringChoice: this.structuringChoice,
                applyPatch: this.applyPatch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
            this.structuringValidator = new StructuringValidator({ structuringChoice: this.structuringChoice });
        }

        public override clone(): OpenAIResponsesEngine<fdm, vdm> {
            const engine = new OpenAIResponsesEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

        protected override async infer(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.infer(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateless(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<RoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateful(wfctx, session) as RoleMessage.Ai.From<fdm, vdm>;
        }

        public override useStateless(middleware: Middleware.From<fdm, vdm>): OpenAIResponsesEngine<fdm, vdm> {
            return super.useStateless(middleware) as OpenAIResponsesEngine<fdm, vdm>;
        }
        public override useStateful(middleware: Middleware.From<fdm, vdm>): OpenAIResponsesEngine<fdm, vdm> {
            return super.useStateful(middleware) as OpenAIResponsesEngine<fdm, vdm>;
        }

        /**
         * @param session mutable
         */
        public override async *agentloop(
            wfctx: InferenceContext,
            session: Session.From<fdm, vdm>,
            fnm: Function.Map<fdm>,
            vhm: Verbatim.Handler.Map<vdm>,
            limit = Number.POSITIVE_INFINITY,
            applyPatch?: Tool.ApplyPatch,
        ): AsyncGenerator<string, string, void> {
            for (let i = 0; i < limit; i++) {
                const response = await this.stateful(wfctx, session);
                if (response.allTextPart()) return response.getText();
                const pfress: Promise<Function.Response.From<fdm>>[] = [];
                const pvress: Promise<RoleMessage.User.Part.Text>[] = [];
                const papress: Promise<Tool.ApplyPatch.Response>[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof Engine.RoleMessage.Ai.Part.Text) {
                        yield part.text;
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
                    } else if (part instanceof Verbatim.Request) {
                        const vreq = part as Verbatim.Request.From<vdm>;
                        const vh = vhm[vreq.name];
                        pvress.push((async () => new RoleMessage.User.Part.Text(await vh.call(vhm, vreq.args)))());
                    } else if (part instanceof Tool.ApplyPatch.Call) {
                        if (applyPatch) {} else throw new Error('Apply patch handler missing.');
                        papress.push((async () => new Tool.ApplyPatch.Response({
                            id: part.raw.call_id,
                            failure: await applyPatch(part.raw.operation),
                        }))());
                    } else throw new Error();
                }
                const fress = await Promise.all(pfress);
                const vress = await Promise.all(pvress);
                const aprs = await Promise.all(papress);
                session.chatMessages.push(new RoleMessage.User([...fress, ...aprs, ...vress]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        applyPatch?: boolean;
    }

    export const create: Engine.Create = function<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    >(options: Engine.Options<fdm, vdm>): Engine<fdm, vdm> {
        return new Instance(options);
    }

    export import Tool = ToolModule.Tool;
    export import RoleMessage = MessageModule.RoleMessage;
}
