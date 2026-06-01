import { Engine } from '../engine.ts';
import { Function } from '../function.ts';
import { MessageCodec } from './openai-responses/message-codec.ts';
import { ToolCodec } from './openai-responses/tool-codec.ts';
import { Billing } from './openai-responses/billing.ts';
import * as TransportModule from './openai-responses/transport.ts';


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

        public constructor(protected options: Engine.Options<fdm>) {
            super(options);

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
    }

    export function create<
        fdm extends Function.Decl.Map.Proto,
    >(options: Engine.Options<fdm>): OpenAIResponsesEngine<fdm> {
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
