import { loadtext } from '@zimtsui/node-loaders';


export default {
    verbatim: {
        instruction: loadtext(import.meta.resolve('../assets/verbatim/instruction.md')),
        declarations: loadtext(import.meta.resolve('../assets/verbatim/declarations.handlebars')),
        system: loadtext(import.meta.resolve('../assets/verbatim/system.handlebars')),
    },
} as const;
