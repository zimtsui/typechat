import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import * as TransportModule from './openai-responses/transport.ts';
import { InferenceContext } from '../inference-context.ts';


export type OpenAIResponsesEngine<
    fdm extends Function.Decl.Map.Proto,
> = OpenAIResponsesEngine.Instance<fdm>;
export namespace OpenAIResponsesEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;
        protected applyPatch: boolean;

        public constructor(protected options: OpenAIResponsesEngine.Options<fdm>) {
            super(options);
            this.applyPatch = options.applyPatch ?? false;

            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
                fdm: this.fdm,
                throttle: this.throttle,
                toolChoice: this.toolChoice,
                applyPatch: this.applyPatch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override clone(): OpenAIResponsesEngine<fdm> {
            const engine = new OpenAIResponsesEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }

        protected override async infer(
            wfctx: InferenceContext,
            session: Engine.Session.From<fdm>,
        ): Promise<Engine.Message.Output.From<fdm>> {
            return await super.infer(wfctx, session) as Engine.Message.Output.From<fdm>;
        }

        public override async stateless(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<Engine.Message.Output.From<fdm>> {
            return await super.stateless(wfctx, session) as Engine.Message.Output.From<fdm>;
        }

        public override async stateful(wfctx: InferenceContext, session: Engine.Session.From<fdm>): Promise<Engine.Message.Output.From<fdm>> {
            return await super.stateful(wfctx, session) as Engine.Message.Output.From<fdm>;
        }

        public override useStateless(middleware: Engine.Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateless(middleware) as OpenAIResponsesEngine<fdm>;
        }
        public override useStateful(middleware: Engine.Middleware.From<fdm>): OpenAIResponsesEngine<fdm> {
            return super.useStateful(middleware) as OpenAIResponsesEngine<fdm>;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Options<fdm> {
        applyPatch?: boolean;
    }

    export function create<
        fdm extends Function.Decl.Map.Proto,
    >(options: OpenAIResponsesEngine.Options<fdm>): OpenAIResponsesEngine<fdm> {
        return new Instance(options);
    }

    createEngine satisfies Engine.Create;
    export function createEngine<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance({
            endpointSpec: options.endpointSpec,
            functionDeclarationMap: options.functionDeclarationMap,
            throttle: options.throttle,
            toolChoice: options.toolChoice,
            providerRetry: options.providerRetry,
            inferenceRetry: options.inferenceRetry,
        });
    }

    export import Transport = TransportModule.Transport;
}
