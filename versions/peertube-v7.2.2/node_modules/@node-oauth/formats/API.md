<a name="isFormat"></a>

## isFormat
Minimal, RFC 6749, compliant unicode validator.

**Kind**: global constant  
**See**: https://datatracker.ietf.org/doc/html/rfc6749#appendix-A  

* [isFormat](#isFormat)
    * [.nchar()](#isFormat.nchar) ⇒ <code>boolean</code>
    * [.nqchar()](#isFormat.nqchar) ⇒ <code>boolean</code>
    * [.nqschar()](#isFormat.nqschar) ⇒ <code>boolean</code>
    * [.uchar()](#isFormat.uchar) ⇒ <code>boolean</code>
    * [.uri()](#isFormat.uri) ⇒ <code>boolean</code>
    * [.vschar()](#isFormat.vschar) ⇒ <code>boolean</code>

<a name="isFormat.nchar"></a>

### isFormat.nchar() ⇒ <code>boolean</code>
Validate if a value matches a unicode character.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: https://tools.ietf.org/html/rfc6749#appendix-A  
<a name="isFormat.nqchar"></a>

### isFormat.nqchar() ⇒ <code>boolean</code>
Validate if a value matches a unicode character, including exclamation marks.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: https://tools.ietf.org/html/rfc6749#appendix-A  
<a name="isFormat.nqschar"></a>

### isFormat.nqschar() ⇒ <code>boolean</code>
Validate if a value matches a unicode character, including exclamation marks and spaces.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: https://tools.ietf.org/html/rfc6749#appendix-A  
<a name="isFormat.uchar"></a>

### isFormat.uchar() ⇒ <code>boolean</code>
Validate if a value matches a unicode character excluding the carriage
return and linefeed characters.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: https://tools.ietf.org/html/rfc6749#appendix-A  
<a name="isFormat.uri"></a>

### isFormat.uri() ⇒ <code>boolean</code>
Validate if a value matches generic URIs.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: http://tools.ietf.org/html/rfc3986#section-3  
<a name="isFormat.vschar"></a>

### isFormat.vschar() ⇒ <code>boolean</code>
Validate if a value matches against the printable set of unicode characters.

**Kind**: static method of [<code>isFormat</code>](#isFormat)  
**Returns**: <code>boolean</code> - true, if valid, otherwise false  
**Value**: <code>string</code> the value to be validated  
**See**: https://tools.ietf.org/html/rfc6749#appendix-A  
