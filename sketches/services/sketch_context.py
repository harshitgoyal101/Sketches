from .file_tree import build_file_tree
from .markdown import render_markdown


def build_sketch_detail_context(sketch):
    description_html = render_markdown(sketch.description)
    source_files = sketch.get_source_files()
    meta_description = sketch.description[:160] if sketch.description else sketch.title
    return {
        "sketch": sketch,
        "description_html": description_html,
        "source_files": source_files,
        "file_tree": build_file_tree(source_files, panel_mode="live"),
        "meta_description": meta_description,
    }
