import * as Google from '@google/genai';
import type { Pricing } from '../../engine.ts';
import { loggers } from '../../telemetry.ts';


export class Billing {
    protected pricing: Pricing;
    public constructor(options: Billing.Options) {
        this.pricing = options.pricing;
    }

    public charge(usageMetadata: Google.GenerateContentResponseUsageMetadata): number {
        loggers.message.info(usageMetadata);

        if (usageMetadata.promptTokenCount) {} else throw new Error('Prompt token count missing.', { cause: usageMetadata });
        const candidatesTokenCount = usageMetadata.candidatesTokenCount ?? 0;
        const cacheHitTokenCount = usageMetadata.cachedContentTokenCount ?? 0;
        const cacheMissTokenCount = usageMetadata.promptTokenCount - cacheHitTokenCount;
        const thinkingTokenCount = usageMetadata.thoughtsTokenCount ?? 0;
        const cost =
            this.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.pricing.outputPrice * candidatesTokenCount / 1e6 +
            this.pricing.outputPrice * thinkingTokenCount / 1e6;
        return cost;
    }
}

export namespace Billing {
    export interface Options {
        pricing: Pricing
    }
}
