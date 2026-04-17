import type { Pricing } from '../../engine.ts';
import OpenAI from 'openai';


export class Billing {
    public constructor(protected ctx: Billing.Context) {}

    public charge(usage: OpenAI.CompletionUsage): number {
        const cacheHitTokenCount = usage.prompt_tokens_details?.cached_tokens ?? 0;
        const cacheMissTokenCount = usage.prompt_tokens - cacheHitTokenCount;
        return (
            this.ctx.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.ctx.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.ctx.pricing.outputPrice * usage.completion_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Context {
        pricing: Pricing
    }
}
