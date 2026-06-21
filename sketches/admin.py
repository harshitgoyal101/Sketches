from django.contrib import admin

from .models import Sketch, SketchAsset, Tag


class SketchAssetInline(admin.TabularInline):
    model = SketchAsset
    extra = 1
    fields = ["order", "filename", "asset_type", "content"]
    ordering = ["order"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(Sketch)
class SketchAdmin(admin.ModelAdmin):
    list_display = ["title", "sketch_type", "status", "is_home_background", "author", "published_at"]
    list_filter = ["status", "sketch_type", "tags"]
    search_fields = ["title", "description", "code"]
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ["tags"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [SketchAssetInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "sketch_type", "status", "is_home_background", "author")}),
        (
            "Content",
            {
                "fields": ("description", "entry_filename", "code", "thumbnail"),
                "description": "Upload a screenshot or preview image for gallery cards and social sharing.",
            },
        ),
        ("Organization", {"fields": ("tags",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "published_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)
