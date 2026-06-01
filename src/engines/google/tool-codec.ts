import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { Parse, ParseError } from 'typebox/schema';
import { removeAdditionalProperties } from '../../function/parameters.ts';
import { Engine } from '../../engine.ts';
import assert from 'node:assert';
import { Text } from '../../text.ts';
import { Media } from '../../media.ts';



export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    protected rawfds: Google.FunctionDeclaration[];
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
        const fdentries = Object.entries(this.fdm) as Function.Decl.Entry.From<fdm>[];
        this.rawfds = fdentries.map(fdentry => ToolCodec.encodeFunctionDeclarationEntry(fdentry));
    }

    public encodeFunctionDeclarationMap(): Google.FunctionDeclaration[] {
        return this.rawfds.slice();
    }

    protected static encodeFunctionDeclarationEntry<fdu extends Function.Decl.Proto>(
        fdentry: Function.Decl.Entry.Of<fdu>,
    ): Google.FunctionDeclaration {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            parameters: removeAdditionalProperties(fdentry[1].parameters) as Google.Schema,
        };
    }


    public decodeFunctionCall(
        googlefc: Google.FunctionCall,
    ): Function.Call.From<fdm> {
        if (googlefc.name) {} else throw new Error();
        const fditem = this.fdm[googlefc.name];
        if (fditem) {} else throw new Engine.Exceptions.InferenceError('Unknown function call', { cause: googlefc });
        try {
            Parse(fditem.parameters, googlefc.args);
        } catch (e) {
            if (e instanceof ParseError)
                throw new Engine.Exceptions.InferenceError('Invalid arguments of function call.', { cause: e });
            else throw e;
        }
        return Function.Call.of({
            id: googlefc.id,
            name: googlefc.name,
            args: googlefc.args,
        } as Function.Call.Options.From<fdm>);
    }

    public encodeFunctionResponse(
        fr: Function.Response.From<fdm>,
    ): Google.Part {
        if (fr instanceof Function.Response.Successful) {
            assert(fr.parts.length === 1);
            if (fr.parts[0]! instanceof Text) {
                const text = fr.parts[0] satisfies Text;
                return {
                    functionResponse: { id: fr.id, name: fr.name, response: { output: text.raw } },
                };
            } else if (fr.parts[0]! instanceof Media.Text) {
                const media = fr.parts[0] satisfies Media.Text;
                return {
                    functionResponse: { id: fr.id, name: fr.name, response: { output: media.quote() } },
                };
            } else if (fr.parts[0]! instanceof Media.Image || fr.parts[0]! instanceof Media.Pdf) {
                const media = fr.parts[0] satisfies Media.Image | Media.Pdf;
                return {
                    functionResponse: {
                        id: fr.id, name: fr.name,
                        parts: [{
                            inlineData: {
                                data: String(media),
                                mimeType: String(media.mimeType),
                                displayName: 'media',
                            },
                        }],
                        response: {
                            output: {
                                $ref: 'media',
                            },
                        },
                    },
                };
            } else throw new Error('Unsupported function response part.', { cause: fr.parts[0]! });
        } else if (fr instanceof Function.Response.Failed)
            return {
                functionResponse: { id: fr.id, name: fr.name, response: { error: fr.error } },
            };
        else throw new Error();
    }

}


export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
