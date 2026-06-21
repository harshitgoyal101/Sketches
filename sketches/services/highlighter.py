from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import JavaLexer, JavascriptLexer, get_lexer_by_name
from pygments.styles.friendly import FriendlyStyle

LIGHT_FORMATTER = HtmlFormatter(
    style=FriendlyStyle,
    cssclass="highlight",
    linenos=True,
    linenostart=1,
)


def highlight_code(code, language="javascript"):
    lexer_map = {
        "javascript": JavascriptLexer,
        "java": JavaLexer,
        "processing": JavaLexer,
    }
    lexer_cls = lexer_map.get(language)
    if lexer_cls:
        lexer = lexer_cls()
    else:
        lexer = get_lexer_by_name(language, stripall=True)

    return highlight(code, lexer, LIGHT_FORMATTER)


def get_highlight_css():
    return LIGHT_FORMATTER.get_style_defs(".highlight")
