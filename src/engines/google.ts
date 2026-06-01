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

            if (options.endpointSpec.parallelToolCall === false) throw new Error('Parallel tool calling is required by Google engine.');
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
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
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override clone(): GoogleEngine<fdm> {
            const engine = new GoogleEngine.Instance(this.options);
            engine.middlewaresStateless = [...this.middlewaresStateless];
            engine.middlewaresStateful = [...this.middlewaresStateful];
            return engine;
        }
    }

    export function create<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): GoogleEngine<fdm> {
        return new Instance(options);
    }

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
