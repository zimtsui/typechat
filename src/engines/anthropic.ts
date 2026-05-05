import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { Verbatim } from '../verbatim.ts';
import { ToolCodec } from './anthropic/tool-codec.ts';
import { Billing } from './anthropic/billing.ts';
import { MessageCodec } from './anthropic/message-codec.ts';
import { Transport } from './anthropic/transport.ts';
import { StructuringValidator } from '../engine/structuring-validator.ts';


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
        protected override structuringValidator: Engine.StructuringValidator.From<fdm, vdm>;

        public constructor(protected options: AnthropicEngine.Options<fdm, vdm>) {
            super(options);
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                providerSpec: this.providerSpecs,
                inferenceParams: this.inferenceOptions,
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
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {}
}
