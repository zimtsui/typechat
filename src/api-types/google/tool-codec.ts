import { Function } from '../../function.ts';
import * as Google from '@google/genai';
import { Parse, ParseError } from 'typebox/schema';



export class ToolCodec<in out fdm extends Function.Decl.Map.Proto> {
    protected fdm: fdm;
    public constructor(options: ToolCodec.Options<fdm>) {
        this.fdm = options.fdm;
    }

    public encodeFunctionCall(
        fc: Function.Call.From<fdm>,
    ): Google.FunctionCall {
        return {
            id: fc.id,
            name: fc.name,
            args: fc.args satisfies Record<string, unknown>,
        };
    }

    public encodeFunctionDeclarationMap(fdm: fdm): Google.FunctionDeclaration[] {
        const fdentries = Object.entries(fdm) as Function.Decl.Entry.From<fdm>[];
        return fdentries.map(fdentry => this.encodeFunctionDeclarationEntry(fdentry));
    }

    protected encodeFunctionDeclarationEntry(
        fdentry: Function.Decl.Entry.From<fdm>,
    ): Google.FunctionDeclaration {
        return {
            name: fdentry[0],
            description: fdentry[1].description,
            parameters: fdentry[1].parameters as unknown as Google.Schema,
        };
    }

    public decodeFunctionCall(
        googlefc: Google.FunctionCall,
    ): Function.Call.From<fdm> {
        if (googlefc.name) {} else throw new Error();
        const fditem = this.fdm[googlefc.name];
        if (fditem) {} else throw new SyntaxError('Unknown function call', { cause: googlefc });
        try {
            Parse(fditem.parameters, googlefc.args);
        } catch (e) {
            if (e instanceof ParseError)
                throw new SyntaxError('Invalid arguments of function call.', { cause: e });
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
        if (fr instanceof Function.Response.Successful) return {
            functionResponse: { id: fr.id, name: fr.name, response: { output: fr.text } },
        }; else if (fr instanceof Function.Response.Failed) return {
            functionResponse: { id: fr.id, name: fr.name, response: { error: fr.error } },
        }; else throw new Error();
    }

}


export namespace ToolCodec {
    export interface Options<in out fdm extends Function.Decl.Map.Proto> {
        fdm: fdm;
    }
}
