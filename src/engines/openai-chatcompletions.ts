import { Function } from '../function.ts';
import { Engine } from '../engine.ts';
import { MessageCodec } from './openai-chatcompletions/message-codec.ts';
import { Transport } from './openai-chatcompletions/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import { StructuringChoice } from '../engine/structuring-choice.ts';
import { StructuringValidator } from '../engine/structuring-validator.ts';
import { ToolCodec } from './openai-chatcompletions/tool-codec.ts';
import { Billing } from './openai-chatcompletions/billing.ts';


export type OpenAIChatCompletionsEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = OpenAIChatCompletionsEngine.Instance<fdm, vdm>;
export namespace OpenAIChatCompletionsEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;

        public constructor(protected options: OpenAIChatCompletionsEngine.Options<fdm, vdm>) {
            super(options);
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
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
            this.structuringValidator = new StructuringValidator({ structuringChoice: this.structuringChoice });
        }

        public override clone(): OpenAIChatCompletionsEngine<fdm, vdm> {
            const engine = new OpenAIChatCompletionsEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {}
}
