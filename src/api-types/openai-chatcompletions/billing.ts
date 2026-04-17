import type { Pricing } from '../../engine.ts';
import OpenAI from 'openai';


export class Billing {
    public constructor(protected comps: Billing.Components) {}

    public charge(usage: OpenAI.CompletionUsage): number {
        const cacheHitTokenCount = usage.prompt_tokens_details?.cached_tokens ?? 0;
        const cacheMissTokenCount = usage.prompt_tokens - cacheHitTokenCount;
        return (
            this.comps.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.comps.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.comps.pricing.outputPrice * usage.completion_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Components {
        pricing: Pricing
    }
}
