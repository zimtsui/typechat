import test from 'ava';
import { MIMEType } from 'whatwg-mimetype';
import { Media } from '../build/media.js';


test('Media image rejects non-image MIME type', t => {
    const error = t.throws(() => new Media.Image({
        mimeType: new MIMEType('text/plain'),
        base64: 'aGVsbG8=',
        resolution: 0,
    }));

    t.is(error?.message, 'Major MIME type of image must be `image`.');
});

test('Media text rejects non-text MIME type', t => {
    const error = t.throws(() => new Media.Text({
        mimeType: new MIMEType('application/json'),
        text: '{}',
    }));

    t.is(error?.message, 'Major MIME type of text must be `text`.');
});

test('Media text quotes as verbatim quotation', t => {
    const media = new Media.Text({
        mimeType: new MIMEType('text/plain'),
        text: 'hello',
    });

    t.is(media.quote().trim(), '<verbatim:quotation mime-type="text/plain"><![CDATA[hello]]></verbatim:quotation>');
});
