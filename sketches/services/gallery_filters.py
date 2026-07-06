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


def _dedupe_preserve_order(values):
    seen = set()
    ordered = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def _parse_multi_param(request, key):
    return _dedupe_preserve_order(value.strip() for value in request.GET.getlist(key) if value.strip())


def parse_filter_params(request, active_tag=None):
    query = request.GET.get("q", "").strip()
    tag_slugs = _parse_multi_param(request, "tag")
    sketch_types = _parse_multi_param(request, "type")
    author_usernames = _parse_multi_param(request, "author")

    if active_tag and active_tag.slug not in tag_slugs:
        tag_slugs.insert(0, active_tag.slug)

    return {
        "query": query,
        "tag_slugs": tag_slugs,
        "sketch_types": sketch_types,
        "author_usernames": author_usernames,
    }


def apply_sketch_filters(queryset, request, active_tag=None):
    params = parse_filter_params(request, active_tag=active_tag)
    query = params["query"]
    tag_slugs = params["tag_slugs"]
    sketch_types = params["sketch_types"]
    author_usernames = params["author_usernames"]

    if tag_slugs:
        valid_tag_slugs = list(
            Tag.objects.filter(slug__in=tag_slugs, is_active=True).values_list("slug", flat=True)
        )
        if valid_tag_slugs:
            queryset = queryset.filter(tags__slug__in=valid_tag_slugs).distinct()
        else:
            queryset = queryset.none()

    valid_types = [value for value in sketch_types if value in valid_sketch_type_slugs()]
    if valid_types:
        queryset = queryset.filter(sketch_type__in=valid_types)

    if author_usernames:
        author_query = Q()
        for username in author_usernames:
            author_query |= Q(author__username__iexact=username)
        queryset = queryset.filter(author_query)

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


def _toggle_value(values, toggle_value):
    values = list(values)
    if toggle_value in values:
        return [value for value in values if value != toggle_value]
    return values + [toggle_value]


def _remove_value(values, remove_value):
    if remove_value is True:
        return []
    return [value for value in values if value != remove_value]


def build_filter_url(
    *,
    query="",
    tag_slugs=None,
    sketch_types=None,
    author_usernames=None,
    remove_tag=False,
    remove_type=False,
    remove_author=False,
    remove_query=False,
    toggle_tag="",
    toggle_type="",
    toggle_author="",
):
    tag_slugs = list(tag_slugs or [])
    sketch_types = list(sketch_types or [])
    author_usernames = list(author_usernames or [])

    if toggle_tag:
        tag_slugs = _toggle_value(tag_slugs, toggle_tag)
    elif remove_tag:
        tag_slugs = _remove_value(tag_slugs, remove_tag)

    if toggle_type:
        sketch_types = _toggle_value(sketch_types, toggle_type)
    elif remove_type:
        sketch_types = _remove_value(sketch_types, remove_type)

    if toggle_author:
        author_usernames = _toggle_value(author_usernames, toggle_author)
    elif remove_author:
        author_usernames = _remove_value(author_usernames, remove_author)

    params = {}

    if not remove_query and query:
        params["q"] = query
    if tag_slugs:
        params["tag"] = tag_slugs
    if sketch_types:
        params["type"] = sketch_types
    if author_usernames:
        params["author"] = author_usernames

    base_url = reverse("sketch_list")
    if not params:
        return base_url
    return f"{base_url}?{urlencode(params, doseq=True)}"


def active_filter_count(params):
    count = 0
    if params.get("query"):
        count += 1
    count += len(active_tags_for_params(params))
    count += len(params.get("sketch_types") or [])
    count += len(params.get("author_usernames") or [])
    return count


def active_tags_for_params(params):
    slugs = params.get("tag_slugs") or []
    if not slugs:
        return []
    tags = Tag.objects.filter(slug__in=slugs, is_active=True).in_bulk(field_name="slug")
    return [tags[slug] for slug in slugs if slug in tags]


def format_label_for_slug(sketch_type):
    if not sketch_type:
        return ""
    match = next((fmt for fmt in active_sketch_formats() if fmt.slug == sketch_type), None)
    return match.name if match else sketch_type


def format_labels_for_slugs(sketch_types):
    return [(slug, format_label_for_slug(slug)) for slug in sketch_types or []]
