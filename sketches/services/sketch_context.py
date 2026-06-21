from .markdown import render_markdown


def build_sketch_detail_context(sketch):
    description_html = render_markdown(sketch.description)
    source_files = sketch.get_source_files()
    meta_description = sketch.description[:160] if sketch.description else sketch.title
    return {
        "sketch": sketch,
        "description_html": description_html,
        "source_files": source_files,
        "meta_description": meta_description,
    }
