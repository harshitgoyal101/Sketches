"""Export and import sketches as on-disk project folders."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from django.conf import settings
from django.utils.text import slugify

from sketches.models import Sketch, SketchAsset, Tag

from .file_tree import normalize_path

META_FILENAME = "meta.json"
TEXT_EXTENSIONS = {".js", ".pde", ".css", ".json", ".txt", ".md"}
ASSET_TYPE_BY_EXT = {
    ".js": SketchAsset.AssetType.JS,
    ".pde": SketchAsset.AssetType.JS,
    ".css": SketchAsset.AssetType.CSS,
    ".json": SketchAsset.AssetType.JSON,
}


def get_sketch_projects_root() -> Path:
    return Path(getattr(settings, "SKETCH_PROJECTS_ROOT", settings.BASE_DIR / "sketch_projects"))


def sketch_project_dir(slug: str) -> Path:
    return get_sketch_projects_root() / slug


def _asset_type_for_path(path: Path) -> str:
    ext = path.suffix.lower()
    return ASSET_TYPE_BY_EXT.get(ext, SketchAsset.AssetType.OTHER)


def _iter_project_files(folder: Path):
    """Yield relative file paths under folder, skipping meta and hidden paths."""
    for path in sorted(folder.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(folder).as_posix()
        if rel == META_FILENAME:
            continue
        if any(part.startswith(".") for part in path.parts):
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        yield rel


def export_sketch(sketch: Sketch, *, overwrite: bool = True) -> Path:
    """Write sketch metadata and source files to sketch_projects/<slug>/."""
    folder = sketch_project_dir(sketch.slug)
    if folder.exists() and overwrite:
        shutil.rmtree(folder)
    folder.mkdir(parents=True, exist_ok=True)

    meta = {
        "title": sketch.title,
        "slug": sketch.slug,
        "sketch_type": sketch.sketch_type,
        "entry_filename": sketch.entry_filename,
        "description": sketch.description,
        "status": sketch.status,
        "tags": list(sketch.tags.order_by("name").values_list("name", flat=True)),
        "is_home_background": sketch.is_home_background,
    }
    (folder / META_FILENAME).write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    entry_path = folder / normalize_path(sketch.entry_filename or sketch.default_entry_filename())
    entry_path.parent.mkdir(parents=True, exist_ok=True)
    entry_path.write_text(sketch.code, encoding="utf-8")

    for asset in sketch.assets.all():
        asset_path = folder / normalize_path(asset.filename)
        asset_path.parent.mkdir(parents=True, exist_ok=True)
        asset_path.write_text(asset.content, encoding="utf-8")

    if sketch.thumbnail:
        thumb_dest = folder / "thumbnail.png"
        with sketch.thumbnail.open("rb") as src, thumb_dest.open("wb") as dest:
            shutil.copyfileobj(src, dest)

    return folder


def import_sketch(
    folder: Path,
    *,
    author=None,
    update_existing: bool = True,
) -> Sketch:
    """Load a sketch project folder into the database."""
    folder = Path(folder).resolve()
    if not folder.is_dir():
        raise FileNotFoundError(f"Sketch folder not found: {folder}")

    meta_path = folder / META_FILENAME
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    else:
        meta = {"title": folder.name.replace("-", " ").title()}

    slug = slugify(meta.get("slug") or meta.get("title") or folder.name)
    if not slug:
        raise ValueError(f"Could not determine slug for {folder}")

    entry_filename = normalize_path(
        meta.get("entry_filename") or Sketch().default_entry_filename()
    )
    entry_path = folder / entry_filename
    if not entry_path.exists():
        raise FileNotFoundError(f"Missing entry file {entry_filename} in {folder}")

    code = entry_path.read_text(encoding="utf-8")
    sketch_defaults = {
        "title": meta.get("title") or slug.replace("-", " ").title(),
        "sketch_type": meta.get("sketch_type", Sketch.SketchType.P5JS),
        "entry_filename": entry_filename,
        "description": meta.get("description", ""),
        "code": code,
        "status": meta.get("status", Sketch.Status.DRAFT),
        "is_home_background": bool(meta.get("is_home_background", False)),
    }
    if author is not None:
        sketch_defaults["author"] = author

    sketch, _created = Sketch.objects.update_or_create(
        slug=slug,
        defaults=sketch_defaults,
    )

    tag_names = meta.get("tags") or []
    if tag_names:
        tags = []
        for name in tag_names:
            tag, _ = Tag.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
            tags.append(tag)
        sketch.tags.set(tags)

    if update_existing:
        sketch.assets.all().delete()

    asset_order = 0
    for rel_path in _iter_project_files(folder):
        if rel_path == entry_filename:
            continue
        file_path = folder / rel_path
        SketchAsset.objects.create(
            sketch=sketch,
            filename=rel_path,
            content=file_path.read_text(encoding="utf-8"),
            asset_type=_asset_type_for_path(file_path),
            order=asset_order,
        )
        asset_order += 1

    thumb_path = folder / "thumbnail.png"
    if thumb_path.exists():
        from django.core.files import File

        with thumb_path.open("rb") as handle:
            sketch.thumbnail.save(f"{slug}-thumbnail.png", File(handle), save=False)
        sketch.save(update_fields=["thumbnail", "updated_at"])

    return sketch


def sync_all_to_disk():
    """Export every sketch in the database to sketch_projects/."""
    root = get_sketch_projects_root()
    root.mkdir(parents=True, exist_ok=True)
    exported = []
    for sketch in Sketch.objects.prefetch_related("assets", "tags"):
        exported.append(export_sketch(sketch))
    return exported
