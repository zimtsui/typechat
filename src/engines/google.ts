import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './google/message-codec.ts';
import { ToolCodec } from './google/tool-codec.ts';
import { Billing } from './google/billing.ts';
import * as TransportModule from './google/transport.ts';


export type GoogleEngine<
    fdm extends Function.Decl.Map.Proto,
> = GoogleEngine.Instance<fdm>;
export namespace GoogleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
    > extends Engine.Instance<fdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: MessageCodec<fdm>;
        protected billing: Billing;
        protected override transport: Transport<fdm>;

        public constructor(protected options: Engine.Options<fdm>) {
            super(options);

            if (options.endpointConfig.parallelToolCall === false) throw new Error('Parallel tool calling is required by Google engine.');
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.messageCodec = new MessageCodec({
                toolCodec: this.toolCodec,
                messageValidator: this.messageValidator,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new Transport({
                inferenceParams: this.inferenceOptions,
                providerSpec: this.providerSpecs,
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
