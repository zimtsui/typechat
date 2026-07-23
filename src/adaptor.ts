import { Config, Secret } from './config.ts';
import { Function } from './function.ts';
import { Throttle } from './throttle.ts';
import { GoogleEngine } from './engines/google.ts';
import { OpenAIResponsesEngine } from './engines/openai-responses.ts';
import { OpenAIChatCompletionsEngine } from './engines/openai-chatcompletions.ts';
import { AnthropicEngine } from './engines/anthropic.ts';
import { OpenAICompatibleEngine } from './engines/openai-compatible.ts';
import { Engine } from './engine.ts';
import { ToolChoice } from './tool-choice.ts';


export class Adaptor {
    public static create(options: Adaptor.Options): Adaptor {
        return new Adaptor(options);
    }

    protected throttles = new Map<string, Throttle>();
    public config: Config;
    protected secret: Secret;
    protected constructor(options: Adaptor.Options) {
        this.config = options.config;
        this.secret = options.secret;
        for (const endpointId in this.config.endpoints) {
            const rpm = this.config.endpoints[endpointId]!.rpm ?? Number.POSITIVE_INFINITY;
            this.throttles.set(endpointId, new Throttle(rpm));
        }
    }

    public [Symbol.dispose]() {
        for (const throttle of this.throttles.values())
            throttle.throw(new Error('Adaptor disposed'));
    }

    public makeEngine<
        fdm extends Function.Decl.Map.Proto,
    >(adaptorOptions: Adaptor.Params<fdm>): Engine<fdm> {
        const endpointConfig = this.config.endpoints[adaptorOptions.endpoint];
        const endpointSecret = this.secret.endpoints[adaptorOptions.endpoint];
        if (endpointConfig && endpointSecret) {} else throw new Error();
        const throttle = this.throttles.get(adaptorOptions.endpoint);
        if (throttle) {} else throw new Error();
        const options: Engine.Options<fdm> = {
            ...adaptorOptions,
            endpointConfig,
            endpointSecret,
            throttle,
        };
        if (endpointConfig.apiType === 'openai-responses')
            return OpenAIResponsesEngine.create<fdm>(options);
        else if (endpointConfig.apiType === 'google')
            return GoogleEngine.create<fdm>(options);
        else if (endpointConfig.apiType === 'anthropic')
            return AnthropicEngine.create<fdm>(options);
        else if (endpointConfig.apiType === 'openai-chatcompletions')
            return OpenAIChatCompletionsEngine.create<fdm>(options);
        else if (endpointConfig.apiType === 'openai-compatible')
            return OpenAICompatibleEngine.create<fdm>(options);
        else throw new Error();
    }
}

export namespace Adaptor {
    export interface Params<in out fdm extends Function.Decl.Map.Proto> {
        endpoint: string;
        functionDeclarationMap: fdm;
        toolChoice?: ToolChoice;
        providerRetry?: number;
        inferenceRetry?: number;
    }

    export interface Options {
        config: Config;
        secret: Secret;
    }
}
