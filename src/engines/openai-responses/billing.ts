import OpenAI from 'openai';
import type { Pricing } from '../../engine.ts';


export class Billing {
    protected pricing: Pricing;
    public constructor(options: Billing.Options) {
        this.pricing = options.pricing;
    }

    public charge(usage: OpenAI.Responses.ResponseUsage): number {
        const cacheHitTokenCount = usage.input_tokens_details.cached_tokens;
        const cacheMissTokenCount = usage.input_tokens - cacheHitTokenCount;
        return (
            this.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.pricing.outputPrice * usage.output_tokens / 1e6
        );
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing;
    }
}

