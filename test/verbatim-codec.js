import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import * as VerbatimCodec from '../build/verbatim/codec.js';


const verbatimDeclarationMap = {
    submit: {
        description: 'Submit an article.',
        parameters: {
            title: {
                description: 'Article title.',
                mimeType: new MIMEType('text/plain'),
                required: false,
            },
            body: {
                description: 'Article body.',
                mimeType: new MIMEType('text/markdown'),
                required: false,
            },
        },
    },
    attachment: {
        description: 'Attach a file.',
        parameters: {
            file: {
                description: 'File content.',
                mimeType: new MIMEType('application/octet-stream'),
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
                mimeType: new MIMEType('text/plain'),
                required: true,
            },
            body: {
                description: 'Article body.',
                mimeType: new MIMEType('text/markdown'),
                required: true,
            },
        },
    },
};

test('Verbatim declarations codec renders channel metadata', t => {
    const xml = VerbatimCodec.Declarations.encode(verbatimDeclarationMap);

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
    t.is(requests[0].name, 'submit');
    t.deepEqual(requests[0].args, {
        title: 'Hello',
        body: '# Heading\nmath: $x^2$\n',
    });
    t.is(requests[1].name, 'attachment');
    t.deepEqual(requests[1].args, {
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
    t.is(requests[0].name, 'submit');
    t.deepEqual(requests[0].args, {
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
    t.deepEqual(requests[0].args, {
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
    t.deepEqual(requests[0].args, {
        title: 'Hello',
        body: 'Body',
    });
});

test('Verbatim request codec ignores additional request and parameter attributes', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request trace-id="123" name="submit" debug='true'>
            <verbatim:parameter role="headline" name="title" ignored="yes"><![CDATA[Hello]]></verbatim:parameter>
            <verbatim:parameter name="body" mime-type="text/markdown"><![CDATA[Body]]></verbatim:parameter>
        </verbatim:request>
    `, verbatimDeclarationMap);

    t.is(requests.length, 1);
    t.is(requests[0].name, 'submit');
    t.deepEqual(requests[0].args, {
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
    t.deepEqual(requests[0].args, {
        title: 'A',
        body: 'B',
    });
    t.deepEqual(requests[1].args, {
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

    t.deepEqual(requests[0].args, {
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

    t.deepEqual(requests[0].args, {
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

test('Verbatim quotation codec encodes quotation text', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello');

    t.regex(xml.trim(), /^<verbatim:quotation\s+mime-type="text\/plain"><!\[CDATA\[echo hello\]\]><\/verbatim:quotation>$/);
});

test('Verbatim quotation codec encodes author attribute', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'echo hello', '"foo" & <bar>');

    t.is(xml.trim(), '<verbatim:quotation author="&quot;foo&quot; &amp; &lt;bar&gt;" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:quotation>');
});

test('Verbatim quotation codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain'), 'a ]]> b');

    t.regex(xml.trim(), /^<verbatim:quotation\s+mime-type="text\/plain"><!\[CDATA\[a \]\]> b\]\]><\/verbatim:quotation>$/);
});

test('Verbatim quotation codec escapes quoted MIME parameters in XML attributes', t => {
    const xml = VerbatimCodec.Quotation.encode(new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    t.regex(xml.trim(), /^<verbatim:quotation\s+mime-type="text\/plain;charset=&quot;foo bar&quot;"><!\[CDATA\[echo hello\]\]><\/verbatim:quotation>$/);
});

test('Verbatim response codec encodes response text', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain'), 'echo hello');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[echo hello]]></verbatim:response>');
});

test('Verbatim response codec preserves CDATA terminator text', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain'), 'a ]]> b');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain"><![CDATA[a ]]> b]]></verbatim:response>');
});

test('Verbatim response codec escapes quoted MIME parameters in XML attributes', t => {
    const xml = VerbatimCodec.Response.encode('bash', new MIMEType('text/plain;charset="foo bar"'), 'echo hello');

    t.is(xml.trim(), '<verbatim:response name="bash" mime-type="text/plain;charset=&quot;foo bar&quot;"><![CDATA[echo hello]]></verbatim:response>');
});
