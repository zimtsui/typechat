import { Function } from '../function.ts';
import * as SessionModule from './google/session.ts';
import { Engine } from '../engine.ts';
import { ToolCodec } from '../api-types/google/tool-codec.ts';
import { Billing } from '../api-types/google/billing.ts';
import * as ValidationModule from './google/validation.ts';
import { MessageCodec as CompatibleMessageCodec } from '../compatible-engine.d/google/message-codec.ts';
import * as MessageCodecModule from './google/message-codec.ts';
import { GoogleNativeTransport } from './google/transport.ts';
import type { Verbatim } from '../verbatim.ts';
import { Structuring } from '../compatible-engine/structuring.ts';
import { env } from 'node:process';
import { Agent, ProxyAgent } from 'undici';



export type GoogleNativeEngine<
    fdm extends Function.Decl.Map.Proto,
    vdm extends Verbatim.Decl.Map.Proto,
> = GoogleNativeEngine.Instance<fdm, vdm>;
export namespace GoogleNativeEngine {
    export class Instance<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Instance<
        fdm, vdm,
        GoogleNativeEngine.RoleMessage.User.From<fdm>,
        GoogleNativeEngine.RoleMessage.Ai.From<fdm, vdm>,
        GoogleNativeEngine.RoleMessage.Developer,
        GoogleNativeEngine.Session.From<fdm, vdm>
    > {
        protected choice: Structuring.Choice.From<fdm, vdm>;
        protected codeExecution: boolean;
        protected urlContext: boolean;
        protected googleSearch: boolean;

        protected toolCodec: ToolCodec<fdm>;
        protected compatibleMessageCodec: CompatibleMessageCodec<fdm, vdm>;
        protected messageCodec: GoogleNativeEngine.MessageCodec<fdm, vdm>;
        protected billing: Billing;
        protected override structuringValidator: GoogleNativeEngine.StructuringValidator.From<fdm, vdm>;
        protected override partsValidator: GoogleNativeEngine.PartsValidator.From<fdm, vdm>;
        protected override transport: GoogleNativeTransport<fdm, vdm>;

        public constructor(protected options: GoogleNativeEngine.Options<fdm, vdm>) {
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
            this.choice = options.structuringChoice ?? Structuring.Choice.AUTO;
            this.codeExecution = options.codeExecution ?? false;
            this.urlContext = options.urlContext ?? false;
            this.googleSearch = options.googleSearch ?? false;

            this.toolCodec = new ToolCodec({
                fdm: this.fdm,
            });
            this.compatibleMessageCodec = new CompatibleMessageCodec({
                toolCodec: this.toolCodec,
                vdm: this.vdm,
            });
            this.messageCodec = new GoogleNativeEngine.MessageCodec({
                toolCodec: this.toolCodec,
                compatibleMessageCodec: this.compatibleMessageCodec,
                codeExecution: this.codeExecution,
                vdm: this.vdm,
            });
            this.billing = new Billing({ pricing: this.pricing });
            this.structuringValidator = new GoogleNativeEngine.StructuringValidator({ choice: this.choice });
            this.partsValidator = new GoogleNativeEngine.PartsValidator();
            this.transport = new GoogleNativeTransport({
                inferenceParams: this.inferenceParams,
                providerSpec: this.providerSpec,
                fdm: this.fdm,
                throttle: this.throttle,
                choice: this.choice,
                codeExecution: this.codeExecution,
                urlContext: this.urlContext,
                googleSearch: this.googleSearch,
                messageCodec: this.messageCodec,
                toolCodec: this.toolCodec,
                billing: this.billing,
            });
        }

        public override appendUserMessage(
            session: GoogleNativeEngine.Session.From<fdm, vdm>,
            message: GoogleNativeEngine.RoleMessage.User.From<fdm>,
        ): GoogleNativeEngine.Session.From<fdm, vdm> {
            return {
                developerMessage: session.developerMessage,
                chatMessages: [...session.chatMessages, message],
            };
        }

        public override pushUserMessage(
            session: GoogleNativeEngine.Session.From<fdm, vdm>,
            message: GoogleNativeEngine.RoleMessage.User.From<fdm>,
        ): GoogleNativeEngine.Session.From<fdm, vdm> {
            session.chatMessages.push(message);
            return session;
        }

        public override clone(): GoogleNativeEngine.Instance<fdm, vdm> {
            const engine = new GoogleNativeEngine.Instance(this.options);
            engine.middlewares = [...this.middlewares];
            engine.statefulMiddlewares = [...this.statefulMiddlewares];
            return engine;
        }
    }

    export interface Options<
        in out fdm extends Function.Decl.Map.Proto,
        in out vdm extends Verbatim.Decl.Map.Proto,
    > extends Engine.Options<fdm, vdm> {
        structuringChoice?: Structuring.Choice.From<fdm, vdm>;
        codeExecution?: boolean;
        urlContext?: boolean;
        googleSearch?: boolean;
    }

    export import Session = SessionModule.Session;
    export import RoleMessage = SessionModule.RoleMessage;
    export import StructuringValidator = ValidationModule.StructuringValidator;
    export import PartsValidator = ValidationModule.PartsValidator;
    export import MessageCodec = MessageCodecModule.MessageCodec;
    export type Middleware<
        fdm extends Function.Decl.Map.Proto,
        vdm extends Verbatim.Decl.Map.Proto,
    > = Engine.Middleware<
        GoogleNativeEngine.RoleMessage.User.From<fdm>,
        GoogleNativeEngine.RoleMessage.Ai.From<fdm, vdm>,
        GoogleNativeEngine.RoleMessage.Developer,
        GoogleNativeEngine.Session.From<fdm, vdm>
    >;
}
