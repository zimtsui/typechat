import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { ToolCodec } from './anthropic/tool-codec.ts';
import { Billing } from './anthropic/billing.ts';
import { MessageCodec } from './anthropic/message-codec.ts';
import { Transport } from './anthropic/transport.ts';
import { StructuringChoice } from './compatible/structuring-choice.ts';
import { StructuringValidator } from './compatible/structuring-validator.ts';


export type AnthropicEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = AnthropicEngine.Instance<fdm, vdm>;
export namespace AnthropicEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm, vdm>;
        protected structuringChoice: StructuringChoice.From<fdm, vdm>;
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;

        public constructor(protected options: AnthropicEngine.Options<fdm, vdm>) {
            super(options);
            this.structuringChoice = options.structuringChoice ?? StructuringChoice.AUTO;
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                providerSpec: this.providerSpec,
                inferenceParams: this.inferenceParams,
                fdm: this.fdm,
                throttle: this.throttle,
                structuringChoice: this.structuringChoice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
            this.structuringValidator = new StructuringValidator({ structuringChoice: this.structuringChoice });
        }

        public override clone(): AnthropicEngine<fdm, vdm> {
            const engine = new AnthropicEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        structuringChoice?: StructuringChoice.From<fdm, vdm>;
    }
}

