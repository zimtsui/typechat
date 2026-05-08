import { loadtext } from '@zimtsui/node-loaders';
import { fileURLToPath } from 'node:url';


export default {
    Xml: {
        instruction: loadtext(fileURLToPath(import.meta.resolve('../assets/xml/instruction.md'))),
        quotation: loadtext(fileURLToPath(import.meta.resolve('../assets/xml/quotation.handlebars'))),
        system: loadtext(fileURLToPath(import.meta.resolve('../assets/xml/system.handlebars'))),
    },
} as const;
