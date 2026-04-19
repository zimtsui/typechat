import type { Pricing } from '../../engine.ts';
import OpenAI from 'openai';


export class Billing {
    public constructor(protected options: Billing.Options) {}

    public charge(usage: OpenAI.CompletionUsage): number {
        const cacheHitTokenCount = usage.prompt_tokens_details?.cached_tokens ?? 0;
        const cacheMissTokenCount = usage.prompt_tokens - cacheHitTokenCount;
        return (
            this.options.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.options.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.options.pricing.outputPrice * usage.completion_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing
    }
}
