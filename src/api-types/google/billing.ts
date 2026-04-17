import * as Google from '@google/genai';
import type { Pricing } from '../../engine.ts';
import { loggers } from '../../telemetry.ts';


export class Billing {
    public constructor(protected comps: Billing.Components) {}

    public charge(usageMetadata: Google.GenerateContentResponseUsageMetadata): number {
        loggers.message.info(usageMetadata);

        if (usageMetadata.promptTokenCount) {} else throw new Error('Prompt token count missing.', { cause: usageMetadata });
        const candidatesTokenCount = usageMetadata.candidatesTokenCount ?? 0;
        const cacheHitTokenCount = usageMetadata.cachedContentTokenCount ?? 0;
        const cacheMissTokenCount = usageMetadata.promptTokenCount - cacheHitTokenCount;
        const thinkingTokenCount = usageMetadata.thoughtsTokenCount ?? 0;
        const cost =
            this.comps.pricing.inputPrice * cacheMissTokenCount / 1e6 +
            this.comps.pricing.cachePrice * cacheHitTokenCount / 1e6 +
            this.comps.pricing.outputPrice * candidatesTokenCount / 1e6 +
            this.comps.pricing.outputPrice * thinkingTokenCount / 1e6;
        return cost;
    }
}

export namespace Billing {
    export interface Components {
        pricing: Pricing
    }
}
