# XML Verbatim Channel

## Motivation

When a LLM outputs structured data in JSON format, if there are too many special characters in the parameters (for example, a large Markdown document containing a lot of LaTeX math formulas), the LLM is prone to make mistakes in JSON escaping.

XML Verbatim Channel is designed to avoid escaping in structured output of large text.

## Declaration

The system or the user is expected to declare all available XML Verbatim Channels in the form of

<verbatim:declaration name="CHANNEL_1_NAME">
    <verbatim:description>DESCRIPTION_OF_CHANNEL_1</verbatim:description>
    <verbatim:parameter name="PARAMETER_1_NAME">
        <verbatim:description>DESCRIPTION_OF_PARAMETER_1</verbatim:description>
        <verbatim:mime-type>VALUE_MIME_TYPE_OF_PARAMETER_1</verbatim:mime-type>
    </verbatim:parameter>
    <verbatim:parameter name="PARAMETER_2_NAME">
        <verbatim:description>DESCRIPTION_OF_PARAMETER_2</verbatim:description>
        <verbatim:mime-type>VALUE_MIME_TYPE_OF_PARAMETER_2</verbatim:mime-type>
    </verbatim:parameter>
</verbatim:declaration>

## Request

You can make a request through the channel CHANNEL_1_NAME in the form of

<verbatim:request name="CHANNEL_1_NAME">
    <verbatim:argument name="PARAMETER_1_NAME"><![CDATA[PARAMETER_1_VALUE]]></verbatim:argument>
    <verbatim:argument name="PARAMETER_2_NAME"><![CDATA[PARAMETER_2_VALUE]]></verbatim:argument>
</verbatim:request>

-   All parameters are required
-   All arguments must be wrapped in CDATA
