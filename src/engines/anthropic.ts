import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { ToolCodec } from './anthropic/tool-codec.ts';
import { Billing } from './anthropic/billing.ts';
import { MessageCodec } from './anthropic/message-codec.ts';
import * as TransportModule from './anthropic/transport.ts';


export type AnthropicEngine<
    fdm extends Function.Decl.Map.Proto,
> = AnthropicEngine.Instance<fdm>;
export namespace AnthropicEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;

        public constructor(protected options: Engine.Options<fdm>) {
            super(options);
            this.toolCodec = new ToolCodec({ fdm: this.fdm });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                messageValidator: this.messageValidator,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                providerSpec: this.providerSpecs,
                inferenceParams: this.inferenceOptions,
                fdm: this.fdm,
                throttle: this.throttle,
                toolChoice: this.toolChoice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }
    }

    create satisfies Engine.Create;
    export function create<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): Engine<fdm> {
        return new Instance(options);
    }

    export import Transport = TransportModule.Transport;
}
