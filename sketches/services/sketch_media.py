"""Upload, validate, and serialize sketch image/audio media."""

from __future__ import annotations

import mimetypes
from pathlib import PurePosixPath

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.urls import reverse

from sketches.forms import _clean_sketch_path
from sketches.models import SketchMedia

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".m4a"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | AUDIO_EXTENSIONS

IMAGE_MAX_BYTES = 5 * 1024 * 1024
AUDIO_MAX_BYTES = 10 * 1024 * 1024

_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
}


def kind_for_extension(ext: str) -> str:
    ext = ext.lower()
    if ext in IMAGE_EXTENSIONS:
        return SketchMedia.Kind.IMAGE
    if ext in AUDIO_EXTENSIONS:
        return SketchMedia.Kind.AUDIO
    raise ValidationError("Unsupported file type. Upload an image or audio file.")


def content_type_for_filename(filename: str, uploaded_type: str = "") -> str:
    ext = PurePosixPath(filename).suffix.lower()
    if ext in _CONTENT_TYPES:
        return _CONTENT_TYPES[ext]
    guessed, _ = mimetypes.guess_type(filename)
    if guessed:
        return guessed
    if uploaded_type:
        return uploaded_type
    return "application/octet-stream"


def max_bytes_for_kind(kind: str) -> int:
    if kind == SketchMedia.Kind.AUDIO:
        return AUDIO_MAX_BYTES
    return IMAGE_MAX_BYTES


def clean_media_filename(value: str) -> str:
    """Normalize media path; disallow empty / traversal / hidden segments."""
    path = _clean_sketch_path(value, field_label="Filename")
    # Media filenames must have an allowed extension.
    ext = PurePosixPath(path).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            "Unsupported file type. Allowed: "
            + ", ".join(sorted(e.lstrip(".") for e in ALLOWED_EXTENSIONS))
        )
    return path


def unique_media_filename(sketch, desired: str) -> str:
    """Return desired filename, or stem2.ext / stem3.ext if taken."""
    base = clean_media_filename(desired)
    existing = set(sketch.media_files.values_list("filename", flat=True))
    if base not in existing:
        return base
    path = PurePosixPath(base)
    stem = path.stem
    ext = path.suffix
    parent = str(path.parent) if path.parent != PurePosixPath(".") else ""
    n = 2
    while True:
        name = f"{stem}{n}{ext}"
        candidate = f"{parent}/{name}" if parent else name
        if candidate not in existing:
            return candidate
        n += 1


def media_public_url(slug: str, filename: str) -> str:
    return reverse(
        "sketch_media_file",
        kwargs={"slug": slug, "filename": filename},
    )


def media_base_url(request, slug: str) -> str:
    """Same-origin media root ending with / for <base href>.

    Use a path (not an absolute host) so srcdoc previews on Vite and
    published embeds both resolve loadImage("file.png") against the page
    origin and hit the Django media route (via Vite proxy in dev).
    """
    sample = reverse(
        "sketch_media_file",
        kwargs={"slug": slug, "filename": "x"},
    )
    return sample.rsplit("/", 1)[0] + "/"


def serialize_media(media: SketchMedia, *, slug: str | None = None) -> dict:
    sketch_slug = slug or media.sketch.slug
    return {
        "id": media.pk,
        "filename": media.filename,
        "kind": media.kind,
        "content_type": media.content_type,
        "size": media.size,
        "url": media_public_url(sketch_slug, media.filename),
        "order": media.order,
    }


def serialize_sketch_media(sketch) -> list[dict]:
    return [
        serialize_media(item, slug=sketch.slug)
        for item in sketch.media_files.all()
    ]


def save_uploaded_media(sketch, upload, *, filename: str | None = None) -> SketchMedia:
    """Validate and store an uploaded file as SketchMedia."""
    raw_name = filename or getattr(upload, "name", "") or "file"
    # Prefer basename from upload if caller didn't override with a path.
    display_name = PurePosixPath(raw_name).name
    final_name = unique_media_filename(sketch, display_name)
    ext = PurePosixPath(final_name).suffix.lower()
    kind = kind_for_extension(ext)

    size = getattr(upload, "size", None)
    if size is None:
        data = upload.read()
        size = len(data)
        content = ContentFile(data, name=PurePosixPath(final_name).name)
    else:
        max_size = max_bytes_for_kind(kind)
        if size > max_size:
            raise ValidationError(
                f"File too large (max {max_size // (1024 * 1024)}MB for {kind})."
            )
        # Read into memory for size re-check after read; FileField will stream.
        data = upload.read()
        size = len(data)
        max_size = max_bytes_for_kind(kind)
        if size > max_size:
            raise ValidationError(
                f"File too large (max {max_size // (1024 * 1024)}MB for {kind})."
            )
        content = ContentFile(data, name=PurePosixPath(final_name).name)

    content_type = content_type_for_filename(
        final_name, getattr(upload, "content_type", "") or ""
    )
    order = sketch.media_files.count()
    media = SketchMedia(
        sketch=sketch,
        filename=final_name,
        content_type=content_type,
        size=size,
        kind=kind,
        order=order,
    )
    media.file.save(PurePosixPath(final_name).name, content, save=False)
    media.save()
    return media


def rename_media(media: SketchMedia, new_filename: str) -> SketchMedia:
    new_name = clean_media_filename(new_filename)
    if new_name == media.filename:
        return media
    if media.sketch.media_files.filter(filename=new_name).exclude(pk=media.pk).exists():
        raise ValidationError("A file with that name already exists.")

    old_ext = PurePosixPath(media.filename).suffix.lower()
    new_ext = PurePosixPath(new_name).suffix.lower()
    if kind_for_extension(old_ext) != kind_for_extension(new_ext):
        raise ValidationError("Cannot change file type when renaming.")

    # Re-save under new basename in storage.
    media.file.open("rb")
    try:
        data = media.file.read()
    finally:
        media.file.close()

    old_file = media.file.name
    media.filename = new_name
    media.content_type = content_type_for_filename(new_name, media.content_type)
    media.file.save(PurePosixPath(new_name).name, ContentFile(data), save=False)
    media.save(update_fields=["filename", "content_type", "file"])

    if old_file and old_file != media.file.name:
        try:
            media.file.storage.delete(old_file)
        except Exception:
            pass
    return media


def delete_media(media: SketchMedia) -> None:
    if media.file:
        try:
            media.file.delete(save=False)
        except Exception:
            pass
    media.delete()


def copy_media_to_sketch(source_sketch, dest_sketch) -> None:
    """Copy binary media when forking a sketch."""
    for index, item in enumerate(source_sketch.media_files.all()):
        if not item.file:
            continue
        try:
            item.file.open("rb")
            data = item.file.read()
        finally:
            try:
                item.file.close()
            except Exception:
                pass
        dest = SketchMedia(
            sketch=dest_sketch,
            filename=item.filename,
            content_type=item.content_type,
            size=item.size or len(data),
            kind=item.kind,
            order=index,
        )
        dest.file.save(
            PurePosixPath(item.filename).name,
            ContentFile(data),
            save=False,
        )
        dest.save()
