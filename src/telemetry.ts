import { Channel, Exporter } from '@zimtsui/typelemetry/log';
import * as Presets from '@zimtsui/typelemetry/log/presets';
import { formatWithOptions } from 'node:util';
import { stderr } from 'node:process';


export const logger = {
    inference: Channel.create<typeof Presets.Level, string>(
        Presets.Level,
        (chunk: string, level) => Exporter.getGlobalExporter().stream({
            scope: '@zimtsui/typechat',
            channel: 'Inference',
            level: Presets.Level[level],
            payload: chunk,
        }),
    ),
    message: Channel.create<typeof Presets.Level, unknown>(
        Presets.Level,
        (payload: unknown, level) => Exporter.getGlobalExporter().monolith({
            scope: '@zimtsui/typechat',
            channel: 'Message',
            level: Presets.Level[level],
            payload: formatWithOptions({ depth: null, colors: !!stderr.isTTY }, payload)
        }),
    ),
};
