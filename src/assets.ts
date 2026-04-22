import { loadtext } from '@zimtsui/node-loaders';
import { fileURLToPath } from 'node:url';


export default {
    verbatim: {
        instruction: loadtext(fileURLToPath(import.meta.resolve('../assets/verbatim/instruction.md'))),
        declarations: loadtext(fileURLToPath(import.meta.resolve('../assets/verbatim/declarations.handlebars'))),
        quotation: loadtext(fileURLToPath(import.meta.resolve('../assets/verbatim/quotation.handlebars'))),
        response: loadtext(fileURLToPath(import.meta.resolve('../assets/verbatim/response.handlebars'))),
        system: loadtext(fileURLToPath(import.meta.resolve('../assets/verbatim/system.handlebars'))),
    },
} as const;
