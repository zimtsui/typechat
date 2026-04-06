import test from 'ava';
import * as VerbatimCodec from '../build/verbatim/codec.js';


const verbatimDeclarationMap = {
    submit: {
        description: 'Submit an article.',
        parameters: {
            title: {
                description: 'Article title.',
                mimeType: 'text/plain',
                required: false,
            },
            body: {
                description: 'Article body.',
                mimeType: 'text/markdown',
                required: false,
            },
        },
    },
    attachment: {
        description: 'Attach a file.',
        parameters: {
            file: {
                description: 'File content.',
                mimeType: 'application/octet-stream',
                required: false,
            },
        },
    },
};

const requiredVerbatimDeclarationMap = {
    submit: {
        description: 'Submit an article.',
        parameters: {
            title: {
                description: 'Article title.',
                mimeType: 'text/plain',
                required: true,
            },
            body: {
                description: 'Article body.',
                mimeType: 'text/markdown',
                required: true,
            },
        },
    },
};

test('Verbatim declarations codec renders channel metadata', t => {
    const xml = VerbatimCodec.Declarations.encode(verbatimDeclarationMap);

    t.regex(xml, /<verbatim:declaration name="submit">/);
    t.regex(xml, /<verbatim:description>Submit an article\.<\/verbatim:description>/);
    t.regex(xml, /<verbatim:parameter name="title" mime-type="text\/plain" required="false">/);
    t.regex(xml, /<verbatim:parameter name="body" mime-type="text\/markdown" required="false">/);
    t.regex(xml, /<verbatim:declaration name="attachment">/);
});

test('Verbatim request codec decodes multiple requests with CDATA payloads', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
            <verbatim:parameter name="body"><![CDATA[# Heading
math: $x^2$
]]></verbatim:parameter>
        </verbatim:request>
        <verbatim:request name="attachment">
            <verbatim:parameter name="file"><![CDATA[binary-ish <content>]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.is(requests.length, 2);
    t.is(requests[0]!.name, 'submit');
    t.deepEqual(requests[0]!.args, {
        title: 'Hello',
        body: '# Heading\nmath: $x^2$\n',
    });
    t.is(requests[1]!.name, 'attachment');
    t.deepEqual(requests[1]!.args, {
        file: 'binary-ish <content>',
    });
});

test('Verbatim request codec accepts flexible whitespace around request and parameter attributes', t => {
    const requests = VerbatimCodec.Request.decode(`
        prefix text ignored
        <verbatim:request   name = "submit"   >
            <verbatim:parameter   name = "title"   ><![CDATA[Hello]]></verbatim:parameter   >
            <verbatim:parameter   name = "body"   ><![CDATA[Body]]></verbatim:parameter   >
        </verbatim:request   >
        suffix text ignored
    `, verbatimDeclarationMap);

    t.is(requests.length, 1);
    t.is(requests[0]!.name, 'submit');
    t.deepEqual(requests[0]!.args, {
        title: 'Hello',
        body: 'Body',
    });
});

test('Verbatim request codec accepts single-quoted attribute values', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name='submit'>
            <verbatim:parameter name='title'><![CDATA[Hello]]></verbatim:parameter>
            <verbatim:parameter name='body'><![CDATA[Body]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.is(requests.length, 1);
    t.deepEqual(requests[0]!.args, {
        title: 'Hello',
        body: 'Body',
    });
});

test('Verbatim request codec accepts mixed quotes and blank lines around CDATA', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name='submit'>
            <verbatim:parameter name="title">

                <![CDATA[Hello]]>

            </verbatim:parameter>
            <verbatim:parameter name='body'>
                <![CDATA[Body]]>
            </verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.is(requests.length, 1);
    t.deepEqual(requests[0]!.args, {
        title: 'Hello',
        body: 'Body',
    });
});

test('Verbatim request codec accepts requests packed together without separators', t => {
    const requests = VerbatimCodec.Request.decode(
        '<verbatim:request name="submit">' +
        '<verbatim:parameter name="title"><![CDATA[A]]></verbatim:parameter>' +
        '<verbatim:parameter name="body"><![CDATA[B]]></verbatim:parameter>' +
        '</verbatim:request>' +
        '<verbatim:request name="attachment">' +
        '<verbatim:parameter name="file"><![CDATA[C]]></verbatim:parameter>' +
        '</verbatim:request>',
        verbatimDeclarationMap,
    );

    t.is(requests.length, 2);
    t.deepEqual(requests[0]!.args, {
        title: 'A',
        body: 'B',
    });
    t.deepEqual(requests[1]!.args, {
        file: 'C',
    });
});

test('Verbatim request codec preserves whitespace inside CDATA payloads', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[  Hello  ]]></verbatim:parameter>
            <verbatim:parameter name="body"><![CDATA[
  line 1

    line 2
]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.deepEqual(requests[0]!.args, {
        title: '  Hello  ',
        body: '\n  line 1\n\n    line 2\n',
    });
});

test('Verbatim request codec rejects unknown channels', t => {
    const error = t.throws(() => VerbatimCodec.Request.decode(`
        <verbatim:request name="missing">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap));

    t.regex(error.message, /Channel not found: missing/);
});

test('Verbatim request codec accepts missing optional parameters', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.deepEqual(requests[0]!.args, {
        title: 'Hello',
    });
});

test('Verbatim request codec rejects missing required parameters', t => {
    const error = t.throws(() => VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
        </verbatim:request>
    `, requiredVerbatimDeclarationMap));

    t.regex(error.message, /Argument of required parameter body of channel submit is missing\./);
});

test('Verbatim request codec rejects duplicate parameters', t => {
    const error = t.throws(() => VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[A]]></verbatim:parameter>
            <verbatim:parameter name="title"><![CDATA[B]]></verbatim:parameter>
            <verbatim:parameter name="body"><![CDATA[Body]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap));

    t.regex(error.message, /Duplicate argument of parameter title/);
});

test('Verbatim system codec encodes system text', t => {
    const xml = VerbatimCodec.System.encode('bash', 'text/plain', 'echo hello');

    t.is(xml.trim(), '<verbatim:system name="bash" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:system>');
});

test('Verbatim system codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.System.encode('bash', 'text/plain', 'a ]]> b');

    t.is(xml.trim(), '<verbatim:system name="bash" mime-type="text/plain"><![CDATA[a ]]> b]]></verbatim:system>');
});

test('Verbatim response codec encodes response text', t => {
    const xml = VerbatimCodec.Response.encode('bash', 'text/plain', 'echo hello');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:response>');
});

test('Verbatim response codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.Response.encode('bash', 'text/plain', 'a ]]> b');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[a ]]> b]]></verbatim:response>');
});
