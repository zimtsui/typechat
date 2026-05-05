import test from 'ava';
import * as VerbatimCodec from '../../build/verbatim/codec.js';


test('Verbatim system codec wraps escaped XML body text', t => {
    const xml = VerbatimCodec.System.encode('a & b < c > d');

    t.is(xml.trim(), '<verbatim:system>a &amp; b &lt; c &gt; d</verbatim:system>');
});
