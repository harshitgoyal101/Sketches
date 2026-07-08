from ..models import Sketch, SketchAsset


def build_fork_attribution(source):
    author_name = source.author.username if source.author else "unknown"
    return f"Forked from [{source.title}](/sketches/{source.slug}/) by @{author_name}."


def default_fork_title(source):
    return f"{source.title} (fork)"


def fork_sketch_from_source(
    source,
    *,
    author,
    title=None,
    entry_filename=None,
    code=None,
    assets=None,
    include_assets=True,
):
    """Create a draft copy owned by author; source sketch is never modified."""
    fork = Sketch(
        title=title or default_fork_title(source),
        sketch_type=source.sketch_type,
        entry_filename=entry_filename or source.entry_filename,
        code=code if code is not None else source.code,
        description=build_fork_attribution(source),
        status=Sketch.Status.DRAFT,
        author=author,
        forked_from=source,
        fork_by=author,
    )
    fork.save()

    if not include_assets:
        return fork

    asset_rows = assets if assets is not None else source.assets.all()
    for index, asset in enumerate(asset_rows):
        if assets is not None:
            filename = asset.get("filename", "")
            content = asset.get("content", "")
            asset_type = asset.get("asset_type", SketchAsset.AssetType.JS)
            order = asset.get("order", index)
        else:
            filename = asset.filename
            content = asset.content
            asset_type = asset.asset_type
            order = asset.order

        if not filename:
            continue

        SketchAsset.objects.create(
            sketch=fork,
            filename=filename,
            content=content,
            asset_type=asset_type,
            order=order,
        )

    return fork
