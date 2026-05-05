import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import * as VerbatimCodec from '../../build/verbatim/codec.js';
import { articleVerbatimDeclarationMap } from '../helpers.js';


test('Verbatim declarations codec renders channel metadata', t => {
    const xml = VerbatimCodec.Declarations.encode(articleVerbatimDeclarationMap);

    t.regex(xml, /<verbatim:declaration name="submit">/);
    t.regex(xml, /<verbatim:description mime-type="text\/markdown"><!\[CDATA\[Submit an article\.\]\]><\/verbatim:description>/);
    t.regex(xml, /<verbatim:parameter name="title">\s*<verbatim:description mime-type="text\/markdown"><!\[CDATA\[Article title\.\]\]><\/verbatim:description>\s*<verbatim:mime-type>text\/plain<\/verbatim:mime-type>\s*<verbatim:required>false<\/verbatim:required>/);
    t.regex(xml, /<verbatim:parameter name="body">\s*<verbatim:description mime-type="text\/markdown"><!\[CDATA\[Article body\.\]\]><\/verbatim:description>\s*<verbatim:mime-type>text\/markdown<\/verbatim:mime-type>\s*<verbatim:required>false<\/verbatim:required>/);
    t.regex(xml, /<verbatim:declaration name="attachment">/);
});

test('Verbatim declarations codec escapes MIME text in element body', t => {
    const xml = VerbatimCodec.Declarations.encode({
        submit: {
            description: 'Submit an article.',
            parameters: {
                body: {
                    description: 'Article body.',
                    mimeType: new MIMEType('text/plain;charset="foo bar"'),
                    required: false,
                },
            },
        },
    });

    t.regex(xml, /<verbatim:mime-type>text\/plain;charset="foo bar"<\/verbatim:mime-type>/);
});

test('Verbatim declarations codec escapes XML meta characters in mime-type element body', t => {
    const xml = VerbatimCodec.Declarations.encode({
        submit: {
            description: 'Submit an article.',
            parameters: {
                body: {
                    description: 'Article body.',
                    mimeType: new MIMEType('text/plain;charset="a&b<c>d"'),
                    required: false,
                },
            },
        },
    });

    t.regex(xml, /<verbatim:mime-type>text\/plain;charset="a&amp;b&lt;c&gt;d"<\/verbatim:mime-type>/);
});
