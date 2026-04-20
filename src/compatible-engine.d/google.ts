import { CompatibleEngine } from '../compatible-engine.ts';
import { Function } from '../function.ts';
import * as MessageCodecModule from './google/message-codec.ts';
import { ToolCodec } from '../api-types/google/tool-codec.ts';
import { Billing } from '../api-types/google/billing.ts';
import * as TransportModule from './google/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import * as ChoiceCodecModule from './google/choice-codec.ts';
import { env } from 'node:process';
import { Agent, ProxyAgent } from 'undici';



export type GoogleCompatibleEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = GoogleCompatibleEngine.Instance<fdm, vdm>;
export namespace GoogleCompatibleEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Instance<fdm, vdm> {
        protected toolCodec: ToolCodec<fdm>;
        protected messageCodec: GoogleCompatibleEngine.MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override transport: GoogleCompatibleEngine.Transport<fdm, vdm>;

        public constructor(protected options: GoogleCompatibleEngine.Options<fdm, vdm>) {
            super(options);

            const proxyUrl = options.endpointSpec.proxy || env.https_proxy || env.HTTPS_PROXY;
            this.providerSpec.dispatcher = proxyUrl
                ? new ProxyAgent({
                    uri: proxyUrl,
                    headersTimeout: 0,
                    bodyTimeout: 0,
                })
                : new Agent({
                    headersTimeout: 0,
                    bodyTimeout: 0,
                });

            if (options.endpointSpec.parallelToolCall === false) throw new Error('Parallel tool calling is required by Google engine.');
            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.messageCodec = new GoogleCompatibleEngine.MessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.transport = new GoogleCompatibleEngine.Transport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.structuringChoice,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override clone(): GoogleCompatibleEngine<fdm, vdm> {
            const engine = new GoogleCompatibleEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends CompatibleEngine.Options<fdm, vdm> {}

    export import Transport = TransportModule.Transport;
    export import MessageCodec = MessageCodecModule.MessageCodec;
    export import ChoiceCodec = ChoiceCodecModule;
}
