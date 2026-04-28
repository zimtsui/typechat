import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import { OpenAIResponsesStructuringChoice } from './openai-responses/structuring-choice.ts';
import { StructuringValidator } from './openai-responses/structuring-validator.ts';
import { Transport } from './openai-responses/transport.ts';
import { InferenceContext } from '../inference-context.ts';
import { Session } from '../session.ts';
import { NativeRoleMessage } from './openai-responses/message.ts';
import { RoleMessage } from '../message.ts';
import { Tool } from './openai-responses/tool.ts';


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
        protected structuringChoice: OpenAIResponsesStructuringChoice.From<fdm, vdm>;
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;
        protected applyPatch: boolean;

        public constructor(protected options: OpenAIResponsesEngine.Options<fdm, vdm>) {
            super(options);
            this.applyPatch = options.applyPatch ?? false;
            this.structuringChoice = options.structuringChoice ?? OpenAIResponsesStructuringChoice.AUTO;

            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
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
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }

        protected override async infer(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<NativeRoleMessage.Ai.From<fdm, vdm>> {
            return await super.infer(wfctx, session) as NativeRoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<NativeRoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateless(wfctx, session) as NativeRoleMessage.Ai.From<fdm, vdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Session.From<fdm, vdm>): Promise<NativeRoleMessage.Ai.From<fdm, vdm>> {
            return await super.stateful(wfctx, session) as NativeRoleMessage.Ai.From<fdm, vdm>;
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
                const pfrs: Promise<Function.Response.From<fdm>>[] = [];
                const pvss: Promise<NativeRoleMessage.User.Part.Text>[] = [];
                const paprs: Promise<Tool.ApplyPatch.Response>[] = [];
                for (const part of response.getParts()) {
                    if (part instanceof NativeRoleMessage.Ai.Part.Text) {
                        yield part.text;
                    } else if (part instanceof Function.Call) {
                        const fcall = part as Function.Call.From<fdm>;
                        const f = fnm[fcall.name];
                        pfrs.push((async () => {
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
                        pvss.push((async () => new NativeRoleMessage.User.Part.Text(await vh.call(vhm, vreq.args)))());
                    } else if (part instanceof Tool.ApplyPatch.Call) {
                        if (applyPatch) {} else throw new Error('Apply patch handler missing.');
                        paprs.push((async () => new Tool.ApplyPatch.Response({
                            id: part.raw.call_id,
                            failure: await applyPatch(part.raw.operation),
                        }))());
                    } else throw new Error();
                }
                const fress = await Promise.all(pfrs);
                const vress = await Promise.all(pvss);
                const aprs = await Promise.all(paprs);
                this.pushUserMessage(session, new RoleMessage.User([...fress, ...vress, ...aprs]));
            }
            throw new Engine.FunctionCallLimitExceeded('Function call limit exceeded.');
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        applyPatch?: boolean;
        structuringChoice?: OpenAIResponsesStructuringChoice.From<fdm, vdm>;
    }
}

export { OpenAIResponsesStructuringChoice } from './openai-responses/structuring-choice.ts';
export { Tool as OpenAIResponsesTool } from './openai-responses/tool.ts';
