from django.contrib import admin

from .models import (
    Game,
    GameScore,
    GuestMigrationLog,
    Sketch,
    SketchAsset,
    SketchFormat,
    Tag,
    TagCategory,
    UserProfile,
    WeeklyChallenge,
)


class SketchAssetInline(admin.TabularInline):
    model = SketchAsset
    extra = 1
    fields = ["order", "filename", "asset_type", "content"]
    ordering = ["order"]


class TagInline(admin.TabularInline):
    model = Tag
    extra = 0
    fields = ["name", "slug", "sort_order", "is_active"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["sort_order", "name"]


@admin.register(TagCategory)
class TagCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order", "is_active"]
    list_editable = ["sort_order", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [TagInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "sort_order", "is_active"]
    list_editable = ["category", "sort_order", "is_active"]
    list_filter = ["is_active", "category"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["category__sort_order", "sort_order", "name"]


@admin.register(SketchFormat)
class SketchFormatAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order", "is_active"]
    list_editable = ["sort_order", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "display_name"]
    search_fields = ["user__username", "user__email", "display_name"]


@admin.register(GuestMigrationLog)
class GuestMigrationLogAdmin(admin.ModelAdmin):
    list_display = ["user", "guest_id", "migrated_at", "payload_hash"]
    search_fields = ["user__username", "guest_id"]
    readonly_fields = ["migrated_at", "payload_hash", "result"]


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "is_active", "max_score", "created_at"]
    list_editable = ["is_active", "max_score"]
    list_filter = ["is_active"]
    search_fields = ["title", "slug", "description"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(GameScore)
class GameScoreAdmin(admin.ModelAdmin):
    list_display = ["user", "game", "score", "played_at", "guest_id"]
    list_filter = ["game"]
    search_fields = ["user__username", "guest_id"]
    readonly_fields = ["created_at"]


@admin.register(Sketch)
class SketchAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "sketch_type",
        "status",
        "home_background_theme",
        "is_home_background",
        "landing_ide_theme",
        "is_landing_ide",
        "is_game",
        "author",
        "published_at",
    ]
    list_filter = ["status", "sketch_type", "is_game", "home_background_theme", "tags"]
    search_fields = ["title", "description", "code"]
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ["tags"]
    readonly_fields = ["created_at", "updated_at", "forked_from", "fork_by"]
    inlines = [SketchAssetInline]
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "title",
                    "slug",
                    "sketch_type",
                    "status",
                    "home_background_theme",
                    "is_home_background",
                    "landing_ide_theme",
                    "is_landing_ide",
                    "is_game",
                    "scoreboard_slug",
                    "author",
                    "forked_from",
                    "fork_by",
                )
            },
        ),
        (
            "Content",
            {
                "fields": ("description", "entry_filename", "code", "thumbnail", "app_icon"),
                "description": "Thumbnail for gallery cards / sharing. App icon is a square mark for mobile lists.",
            },
        ),
        ("Organization", {"fields": ("tags",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "published_at")}),
    )

    def save_model(self, request, obj, form, change):
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(WeeklyChallenge)
class WeeklyChallengeAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "tag", "starts_on", "ends_on", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["title", "prompt", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ["tag"]
    date_hierarchy = "starts_on"
