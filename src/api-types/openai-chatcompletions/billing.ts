import type { Pricing } from '../../engine.ts';
import OpenAI from 'openai';


export class Billing {
    protected pricing: Pricing;
    public constructor(options: Billing.Options) {
        this.pricing = options.pricing;
    }

    public charge(usage: OpenAI.CompletionUsage): number {
        const cacheHitTokenCount = usage.prompt_tokens_details?.cached_tokens ?? 0;
        const cacheMissTokenCount = usage.prompt_tokens - cacheHitTokenCount;
        return (
            this.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.pricing.outputPrice * usage.completion_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing
    }
}
