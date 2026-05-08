import test from 'ava';
import * as XmlCodec from '../../build/xml.js';


test('XML system codec wraps escaped XML body text', t => {
    const xml = XmlCodec.System.encode('a & b < c > d');

    t.is(xml.trim(), '<typechat:system>a &amp; b &lt; c &gt; d</typechat:system>');
});
