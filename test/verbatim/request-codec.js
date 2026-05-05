import test from 'ava';
import * as VerbatimCodec from '../../build/verbatim/codec.js';
import {
    articleVerbatimDeclarationMap,
    requiredArticleVerbatimDeclarationMap,
} from '../helpers.js';


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
    `, articleVerbatimDeclarationMap);

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
    `, articleVerbatimDeclarationMap);

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
    `, articleVerbatimDeclarationMap);

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
    `, articleVerbatimDeclarationMap);

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
    `, articleVerbatimDeclarationMap);

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
        articleVerbatimDeclarationMap,
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
    `, articleVerbatimDeclarationMap);

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
    `, articleVerbatimDeclarationMap));

    t.regex(error.message, /Channel not found: missing/);
});

test('Verbatim request codec accepts missing optional parameters', t => {
    const requests = VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
        </verbatim:request>
    `, articleVerbatimDeclarationMap);

    t.deepEqual(requests[0].args, {
        title: 'Hello',
    });
});

test('Verbatim request codec rejects missing required parameters', t => {
    const error = t.throws(() => VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[Hello]]></verbatim:parameter>
        </verbatim:request>
    `, requiredArticleVerbatimDeclarationMap));

    t.regex(error.message, /Argument of required parameter body of channel submit is missing\./);
});

test('Verbatim request codec rejects duplicate parameters', t => {
    const error = t.throws(() => VerbatimCodec.Request.decode(`
        <verbatim:request name="submit">
            <verbatim:parameter name="title"><![CDATA[A]]></verbatim:parameter>
            <verbatim:parameter name="title"><![CDATA[B]]></verbatim:parameter>
            <verbatim:parameter name="body"><![CDATA[Body]]></verbatim:parameter>
        </verbatim:request>
    `, articleVerbatimDeclarationMap));

    t.is(error.message, 'Duplicate argument.');
});
