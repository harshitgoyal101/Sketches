from urllib.parse import urlencode

from django.contrib.auth import get_user_model
from django.db.models import Prefetch, Q
from django.urls import reverse

from sketches.models import Sketch, SketchFormat, Tag, TagCategory

PUBLISHED = Sketch.Status.PUBLISHED
User = get_user_model()


def active_sketch_formats():
    formats = list(SketchFormat.objects.filter(is_active=True).order_by("sort_order", "name"))
    if formats:
        return formats
    return [
        SketchFormat(name=label, slug=value, sort_order=index)
        for index, (value, label) in enumerate(Sketch.SketchType.choices)
    ]


def valid_sketch_type_slugs():
    slugs = set(
        SketchFormat.objects.filter(is_active=True).values_list("slug", flat=True)
    )
    if slugs:
        return slugs
    return {choice[0] for choice in Sketch.SketchType.choices}


def published_tags_queryset():
    return (
        Tag.objects.filter(is_active=True, sketches__status=PUBLISHED)
        .distinct()
        .order_by("sort_order", "name")
    )


def published_authors():
    return (
        User.objects.filter(sketches__status=PUBLISHED)
        .distinct()
        .order_by("username")
    )


def filter_tag_categories():
    published_tags = published_tags_queryset()
    tag_ids = published_tags.values_list("pk", flat=True)

    categories = (
        TagCategory.objects.filter(is_active=True, tags__in=tag_ids)
        .distinct()
        .prefetch_related(
            Prefetch(
                "tags",
                queryset=Tag.objects.filter(
                    is_active=True,
                    pk__in=tag_ids,
                ).order_by("sort_order", "name"),
            )
        )
        .order_by("sort_order", "name")
    )

    categorized_ids = set()
    grouped = []
    for category in categories:
        tags = [tag for tag in category.tags.all() if tag.is_active]
        if not tags:
            continue
        categorized_ids.update(tag.pk for tag in tags)
        grouped.append({"category": category, "tags": tags})

    uncategorized = [tag for tag in published_tags if tag.pk not in categorized_ids]
    if uncategorized:
        grouped.append({"category": None, "tags": uncategorized})

    return grouped


def parse_filter_params(request, active_tag=None):
    query = request.GET.get("q", "").strip()
    tag_slug = active_tag.slug if active_tag else request.GET.get("tag", "").strip()
    sketch_type = request.GET.get("type", "").strip()
    author_username = request.GET.get("author", "").strip()
    return {
        "query": query,
        "tag_slug": tag_slug,
        "sketch_type": sketch_type,
        "author_username": author_username,
    }


def apply_sketch_filters(queryset, request, active_tag=None):
    params = parse_filter_params(request, active_tag=active_tag)
    query = params["query"]
    tag_slug = params["tag_slug"]
    sketch_type = params["sketch_type"]
    author_username = params["author_username"]

    if tag_slug and Tag.objects.filter(slug=tag_slug, is_active=True).exists():
        queryset = queryset.filter(tags__slug=tag_slug)

    if sketch_type in valid_sketch_type_slugs():
        queryset = queryset.filter(sketch_type=sketch_type)

    if author_username:
        queryset = queryset.filter(author__username__iexact=author_username)

    if query:
        if query.startswith("@"):
            author_term = query[1:].strip()
            if author_term:
                queryset = queryset.filter(author__username__icontains=author_term)
            else:
                queryset = queryset.filter(author__isnull=False)
        else:
            queryset = queryset.filter(
                Q(title__icontains=query)
                | Q(description__icontains=query)
                | Q(code__icontains=query)
                | Q(tags__name__icontains=query)
                | Q(author__username__icontains=query)
            ).distinct()

    return queryset, params


def build_filter_url(
    *,
    query="",
    tag_slug="",
    sketch_type="",
    author_username="",
    remove_tag=False,
    remove_type=False,
    remove_author=False,
    remove_query=False,
    toggle_tag="",
    toggle_type="",
    toggle_author="",
):
    params = {}

    if not remove_query and query:
        params["q"] = query

    if toggle_tag:
        if toggle_tag == tag_slug:
            pass
        else:
            params["tag"] = toggle_tag
    elif tag_slug and not remove_tag:
        params["tag"] = tag_slug

    if toggle_type:
        if toggle_type == sketch_type:
            pass
        else:
            params["type"] = toggle_type
    elif sketch_type and not remove_type:
        params["type"] = sketch_type

    if toggle_author:
        if toggle_author == author_username:
            pass
        else:
            params["author"] = toggle_author
    elif author_username and not remove_author:
        params["author"] = author_username

    base_url = reverse("sketch_list")
    if not params:
        return base_url
    return f"{base_url}?{urlencode(params)}"


def active_filter_count(params):
    count = 0
    if params.get("query"):
        count += 1
    if params.get("tag_slug"):
        count += 1
    if params.get("sketch_type"):
        count += 1
    if params.get("author_username"):
        count += 1
    return count


def format_label_for_slug(sketch_type):
    if not sketch_type:
        return ""
    match = next((fmt for fmt in active_sketch_formats() if fmt.slug == sketch_type), None)
    return match.name if match else sketch_type
