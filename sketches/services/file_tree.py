"""Build nested folder trees from flat sketch file lists."""

from __future__ import annotations


def normalize_path(path: str) -> str:
    return path.replace("\\", "/").strip().lstrip("/")


def build_file_tree(source_files, *, panel_mode="live"):
    """
    Turn a flat list of sketch source dicts into a nested tree for the file sidebar.

    panel_mode:
      - ``live`` — panel ids are numeric tab indices (detail page editor)
      - ``edit`` — panel ids are ``main`` or ``asset-N`` (create/edit formset)
    """
    root = {"name": "", "type": "folder", "children": []}
    folder_index = {"": root}
    asset_index = 0

    for index, file_info in enumerate(source_files):
        filename = normalize_path(file_info.get("filename") or "")
        if not filename:
            continue

        is_main = bool(file_info.get("is_main"))
        if panel_mode == "edit":
            panel = "main" if is_main else f"asset-{asset_index}"
            if not is_main:
                asset_index += 1
        else:
            panel = str(index)

        parts = filename.split("/")
        parent_path = ""

        for depth, part in enumerate(parts):
            is_file = depth == len(parts) - 1
            current_path = "/".join(parts[: depth + 1])

            if is_file:
                folder_index[parent_path]["children"].append(
                    {
                        "type": "file",
                        "name": part,
                        "path": filename,
                        "panel": panel,
                        "tab_index": index,
                        "is_main": is_main,
                        "asset_id": file_info.get("asset_id"),
                    }
                )
                continue

            if current_path not in folder_index:
                folder_node = {
                    "type": "folder",
                    "name": part,
                    "path": current_path,
                    "children": [],
                }
                folder_index[parent_path]["children"].append(folder_node)
                folder_index[current_path] = folder_node

            parent_path = current_path

    _sort_tree(root)
    return root


def _sort_tree(node):
    if node["type"] != "folder":
        return
    node["children"].sort(key=lambda item: (item["type"] != "folder", item["name"].lower()))
    for child in node["children"]:
        if child["type"] == "folder":
            _sort_tree(child)
