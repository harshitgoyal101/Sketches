import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import Client, SimpleTestCase, TestCase, override_settings

from sketches.forms import SketchDetailsForm, SketchEditForm
from sketches.models import Sketch
from sketches.services.embed_builder import (
    EMBED_ROOT,
    build_p5_embed_html,
    build_processing_embed_html,
)
from sketches.services.sketch_starters import (
    get_default_filename,
    get_starter_code,
    normalize_sketch_type,
)


class EmbedBuilderTests(SimpleTestCase):
    def test_build_preview_mode_includes_restart_snippet(self):
        html = build_p5_embed_html("function setup() {}", mode="preview")
        self.assertIn("sketch-preview-restart", html)
        self.assertIn("p5.min.js", html)

    def test_build_fullscreen_mode_includes_restart_handler(self):
        html = build_p5_embed_html("function setup() {}", mode="fullscreen")
        self.assertIn("sketch-restart", html)
        self.assertIn("sketch-mouse", html)
        self.assertNotIn("sketch-preview-restart", html)
        self.assertIn("background: #ffffff", html)

    def test_build_live_mode_includes_error_reporter_and_mouse_bridge(self):
        html = build_p5_embed_html("function setup() {}", mode="live", run_id=7)
        self.assertIn("sketch-preview-error", html)
        self.assertIn("sketch-mouse", html)
        self.assertIn("sketch-restart", html)
        self.assertIn("var runId = 7", html)
        self.assertNotIn("sketch-preview-restart", html)

    def test_assets_are_ordered_before_main_code(self):
        assets = [
            {"asset_type": "js", "content": "const helper = true;"},
            {"asset_type": "css", "content": "body { color: red; }"},
        ]
        html = build_p5_embed_html("function setup() {}", assets=assets, mode="preview")
        helper_pos = html.index("const helper = true;")
        main_pos = html.index("function setup() {}")
        css_pos = html.index("body { color: red; }")
        self.assertLess(css_pos, helper_pos)
        self.assertLess(helper_pos, main_pos)

    def test_shared_embed_assets_exist(self):
        self.assertTrue((EMBED_ROOT / "config.json").exists())
        self.assertTrue((EMBED_ROOT / "p5-shell.html").exists())
        self.assertTrue((EMBED_ROOT / "processing-shell.html").exists())
        self.assertTrue((EMBED_ROOT / "snippets" / "error-reporter.js").exists())
        self.assertTrue((EMBED_ROOT / "snippets" / "processing-bootstrap.js").exists())

    def test_build_processing_preview_includes_processingjs(self):
        html = build_processing_embed_html(
            "void setup() { size(200, 200); }",
            mode="preview",
        )
        self.assertIn("/static/sketches/embed/processing.min.js", html)
        self.assertIn('id="sketch-canvas-host"', html)
        self.assertIn("new Processing(canvas", html)
        self.assertIn("void setup()", html)
        self.assertNotIn("p5.min.js", html)
        self.assertNotIn('type="application/processing"', html)

    def test_build_processing_includes_extra_pde_tabs(self):
        html = build_processing_embed_html(
            "void setup() { size(200, 200); }",
            assets=[{"asset_type": "js", "content": "void helper() {}"}],
            mode="preview",
        )
        self.assertIn("void helper()", html)
        self.assertIn("void setup()", html)


class SketchStarterTests(SimpleTestCase):
    def test_normalize_sketch_type_defaults_to_p5js(self):
        self.assertEqual(normalize_sketch_type(None), Sketch.SketchType.P5JS)
        self.assertEqual(normalize_sketch_type("invalid"), Sketch.SketchType.P5JS)

    def test_processing_starter_uses_pde_filename_and_syntax(self):
        self.assertEqual(get_default_filename(Sketch.SketchType.PROCESSING), "sketch.pde")
        code = get_starter_code(Sketch.SketchType.PROCESSING)
        self.assertIn("void setup()", code)
        self.assertIn("size(400, 300)", code)

    def test_create_form_prefills_processing_defaults(self):
        form = SketchEditForm(
            initial={"sketch_type": Sketch.SketchType.PROCESSING},
            is_admin=False,
        )
        self.assertEqual(form.initial["entry_filename"], "sketch.pde")
        self.assertIn("void setup()", form.initial["code"])
        self.assertEqual(form.fields["code"].widget.attrs["data-editor-lang"], "java")

    def test_create_form_fills_blank_entry_filename_on_clean(self):
        form = SketchEditForm(
            data={
                "title": "Test",
                "description": "",
                "entry_filename": "",
                "code": get_starter_code(Sketch.SketchType.PROCESSING),
                "sketch_type": Sketch.SketchType.PROCESSING,
            },
            is_admin=False,
        )
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data["entry_filename"], "sketch.pde")

    def test_edit_form_locks_sketch_type(self):
        sketch = Sketch(
            title="Locked Type",
            slug="locked-type",
            sketch_type=Sketch.SketchType.PROCESSING,
            entry_filename="sketch.pde",
            code="void setup() {}",
        )
        sketch.pk = 1
        form = SketchEditForm(
            data={
                "title": "Locked Type",
                "entry_filename": "sketch.pde",
                "code": "void setup() {}",
                "sketch_type": Sketch.SketchType.P5JS,
            },
            instance=sketch,
            editor_mode=True,
            lock_sketch_type=True,
        )
        self.assertTrue(form.is_valid())
        self.assertNotIn("sketch_type", form.fields)
        self.assertEqual(form.cleaned_data["sketch_type"], Sketch.SketchType.PROCESSING)


class FileTreeTests(SimpleTestCase):
    def test_builds_nested_folders(self):
        from sketches.services.file_tree import build_file_tree

        tree = build_file_tree(
            [
                {"filename": "sketch.js", "is_main": True},
                {"filename": "lib/Pixel.js", "is_main": False, "asset_id": 1},
            ],
            panel_mode="edit",
        )
        self.assertEqual(len(tree["children"]), 2)
        lib_folder = next(node for node in tree["children"] if node["type"] == "folder")
        self.assertEqual(lib_folder["name"], "lib")
        self.assertEqual(lib_folder["children"][0]["name"], "Pixel.js")
        self.assertEqual(lib_folder["children"][0]["panel"], "asset-0")

    def test_edit_mode_uses_main_and_asset_panels(self):
        from sketches.services.file_tree import build_file_tree

        tree = build_file_tree(
            [
                {"filename": "sketch.js", "is_main": True},
                {"filename": "helper.js", "is_main": False},
            ],
            panel_mode="edit",
        )
        files = [node for node in tree["children"] if node["type"] == "file"]
        main_file = next(node for node in files if node["is_main"])
        helper_file = next(node for node in files if not node["is_main"])
        self.assertEqual(main_file["panel"], "main")
        self.assertEqual(helper_file["panel"], "asset-0")


class SketchFilesystemTests(TestCase):
    def setUp(self):
        from django.conf import settings
        import tempfile

        self.temp_dir = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(SKETCH_PROJECTS_ROOT=Path(self.temp_dir.name))
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        self.temp_dir.cleanup()

    def test_export_and_import_round_trip(self):
        from pathlib import Path

        from sketches.models import SketchAsset
        from sketches.services.sketch_filesystem import export_sketch, import_sketch

        sketch = Sketch.objects.create(
            title="Nested Files",
            slug="nested-files",
            sketch_type=Sketch.SketchType.P5JS,
            entry_filename="sketch.js",
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
        )
        SketchAsset.objects.create(
            sketch=sketch,
            filename="lib/particle.js",
            content="class Particle {}",
            asset_type="js",
            order=0,
        )

        folder = export_sketch(sketch)
        self.assertTrue((folder / "meta.json").exists())
        self.assertTrue((folder / "sketch.js").exists())
        self.assertTrue((folder / "lib" / "particle.js").exists())

        Sketch.objects.filter(slug="nested-files").delete()
        imported = import_sketch(folder)
        self.assertEqual(imported.slug, "nested-files")
        self.assertEqual(imported.assets.count(), 1)
        self.assertEqual(imported.assets.first().filename, "lib/particle.js")


@override_settings(ALLOWED_HOSTS=["testserver"])
class GalleryFilterTests(TestCase):
    def setUp(self):
        from sketches.models import SketchFormat, Tag, TagCategory

        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="filter-user", password="secret")
        self.category, _ = TagCategory.objects.get_or_create(
            slug="topics",
            defaults={
                "name": "Topics",
                "description": "Browse sketches by theme or subject",
                "sort_order": 0,
                "is_active": True,
            },
        )
        self.tag = Tag.objects.create(name="Particles", slug="particles", category=self.category)
        self.sketch = Sketch.objects.create(
            title="Particle Field",
            slug="particle-field",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
            description="Blue dots connected by lines",
        )
        self.sketch.tags.add(self.tag)
        SketchFormat.objects.get_or_create(slug="p5js", defaults={"name": "p5.js"})
        SketchFormat.objects.get_or_create(slug="processing", defaults={"name": "Processing"})
        self.client = Client()

    def test_search_filter_finds_sketch_by_author_username(self):
        response = self.client.get("/sketches/", {"q": "filter-user"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")

    def test_at_prefix_search_filters_by_author(self):
        response = self.client.get("/sketches/", {"q": "@filter"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")

    def test_search_filter_finds_sketch_by_title(self):
        response = self.client.get("/sketches/", {"q": "Particle"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")

    def test_type_filter_limits_results(self):
        Sketch.objects.create(
            title="Processing Sketch",
            slug="processing-sketch",
            sketch_type=Sketch.SketchType.PROCESSING,
            code="void setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        response = self.client.get("/sketches/", {"type": "processing"})
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Particle Field")
        self.assertContains(response, "Processing Sketch")

    def test_author_filter_limits_results(self):
        response = self.client.get("/sketches/", {"author": "filter-user"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")

    def test_tag_filter_via_query_param(self):
        response = self.client.get("/sketches/", {"tag": "particles"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")

    def test_inactive_tag_is_ignored(self):
        self.tag.is_active = False
        self.tag.save(update_fields=["is_active"])
        response = self.client.get("/sketches/", {"tag": "particles"})
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "Particle Field")

    def test_multi_tag_filter_matches_any_selected_tag(self):
        from sketches.models import Tag

        second_tag = Tag.objects.create(name="Network", slug="network", category=self.category)
        second_sketch = Sketch.objects.create(
            title="Network Graph",
            slug="filter-user-network-graph",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        second_sketch.tags.add(second_tag)

        response = self.client.get("/sketches/", [("tag", "particles"), ("tag", "network")])
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")
        self.assertContains(response, "Network Graph")

    def test_multi_type_filter_matches_any_selected_format(self):
        processing_sketch = Sketch.objects.create(
            title="Processing Sketch",
            slug="filter-user-processing-sketch",
            sketch_type=Sketch.SketchType.PROCESSING,
            code="void setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        response = self.client.get("/sketches/", [("type", "p5js"), ("type", "processing")])
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Particle Field")
        self.assertContains(response, "Processing Sketch")

    def test_toggle_tag_url_adds_and_removes_from_selection(self):
        from sketches.services.gallery_filters import build_filter_url

        url = build_filter_url(tag_slugs=["particles"], toggle_tag="network")
        self.assertIn("tag=particles", url)
        self.assertIn("tag=network", url)

        url = build_filter_url(tag_slugs=["particles", "network"], toggle_tag="network")
        self.assertIn("tag=particles", url)
        self.assertNotIn("tag=network", url)

    def test_gallery_filter_ui_renders(self):
        response = self.client.get("/sketches/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "gallery-filters")
        self.assertContains(response, "Particles")
        self.assertContains(response, "p5.js")
        self.assertContains(response, "@filter-user")


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchEditorAccessTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="author", password="secret")
        self.other = user_model.objects.create_user(username="visitor", password="secret")
        self.sketch = Sketch.objects.create(
            title="Public Sketch",
            slug="public-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        self.draft = Sketch.objects.create(
            title="Draft Sketch",
            slug="draft-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client = Client()

    def test_anonymous_user_can_open_published_editor(self):
        response = self.client.get("/accounts/sketches/public-sketch/edit/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "You can edit code and run a live preview here")
        self.assertNotContains(response, "Save changes")

    def test_anonymous_user_cannot_open_draft_editor(self):
        response = self.client.get("/accounts/sketches/draft-sketch/edit/")
        self.assertEqual(response.status_code, 403)

    def test_anonymous_user_cannot_save_published_sketch(self):
        response = self.client.post(
            "/accounts/sketches/public-sketch/edit/",
            {
                "title": "Hacked",
                "entry_filename": "sketch.js",
                "code": "function setup() {}",
                "sketch_type": "p5js",
            },
        )
        self.assertEqual(response.status_code, 403)
        self.sketch.refresh_from_db()
        self.assertEqual(self.sketch.title, "Public Sketch")

    def test_author_can_save_published_sketch(self):
        self.client.force_login(self.author)
        response = self.client.post(
            "/accounts/sketches/public-sketch/edit/",
            {
                "title": "Updated Title",
                "entry_filename": "sketch.js",
                "code": "function setup() { createCanvas(100, 100); }",
                "sketch_type": "p5js",
                "assets-TOTAL_FORMS": "0",
                "assets-INITIAL_FORMS": "0",
                "assets-MIN_NUM_FORMS": "0",
                "assets-MAX_NUM_FORMS": "1000",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.sketch.refresh_from_db()
        self.assertEqual(self.sketch.title, "Updated Title")

    def test_edit_form_post_valid_without_sketch_type_field(self):
        form = SketchEditForm(
            data={
                "title": "Updated Title",
                "entry_filename": "sketch.js",
                "code": "function setup() { createCanvas(100, 100); }",
            },
            instance=self.sketch,
            editor_mode=True,
            lock_sketch_type=True,
        )
        self.assertTrue(form.is_valid(), form.errors)
        saved = form.save()
        self.assertEqual(saved.sketch_type, Sketch.SketchType.P5JS)
        self.assertIn("createCanvas", saved.code)

    def test_anonymous_preview_cache_works(self):
        response = self.client.post(
            "/accounts/sketches/preview/",
            data=json.dumps(
                {
                    "sketch_type": "p5js",
                    "main_code": "function setup() {}",
                    "assets": [],
                    "mode": "live",
                    "run_id": 1,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("url", response.json())


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchSettingsTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="settings-author", password="secret")
        self.other = user_model.objects.create_user(username="settings-visitor", password="secret")
        self.sketch = Sketch.objects.create(
            title="My Sketch",
            slug="my-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            description="Old description",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client = Client()

    def test_author_can_open_settings_page(self):
        self.client.force_login(self.author)
        response = self.client.get("/accounts/sketches/my-sketch/settings/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sketch settings")
        self.assertContains(response, "sketch-description-input")
        self.assertNotContains(response, "code-editor")

    def test_visitor_cannot_open_settings_page(self):
        self.client.force_login(self.other)
        response = self.client.get("/accounts/sketches/my-sketch/settings/")
        self.assertEqual(response.status_code, 403)

    def test_author_can_save_description(self):
        self.client.force_login(self.author)
        response = self.client.post(
            "/accounts/sketches/my-sketch/settings/",
            {
                "title": "My Sketch",
                "description": "Updated **description**",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.sketch.refresh_from_db()
        self.assertEqual(self.sketch.description, "Updated **description**")

    def test_details_form_excludes_admin_fields_for_authors(self):
        form = SketchDetailsForm(instance=self.sketch, is_admin=False)
        self.assertIn("description", form.fields)
        self.assertIn("thumbnail", form.fields)
        self.assertNotIn("slug", form.fields)
        self.assertNotIn("status", form.fields)

    def test_details_form_excludes_slug_for_admins(self):
        form = SketchDetailsForm(instance=self.sketch, is_admin=True)
        self.assertNotIn("slug", form.fields)
        self.assertIn("status", form.fields)


class SketchSlugTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="alice", password="secret")
        self.other = user_model.objects.create_user(username="bob", password="secret")

    def test_duplicate_titles_get_unique_slugs(self):
        Sketch.objects.create(
            title="My Sketch",
            author=self.author,
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        second = Sketch.objects.create(
            title="My Sketch",
            author=self.author,
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        self.assertEqual(second.slug, "alice-my-sketch-2")

    def test_different_authors_same_title_get_different_slugs(self):
        first = Sketch.objects.create(
            title="My Sketch",
            author=self.author,
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        second = Sketch.objects.create(
            title="My Sketch",
            author=self.other,
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        self.assertEqual(first.slug, "alice-my-sketch")
        self.assertEqual(second.slug, "bob-my-sketch")

    def test_changing_title_does_not_change_slug(self):
        sketch = Sketch.objects.create(
            title="Original Title",
            author=self.author,
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        sketch.title = "New Title"
        sketch.save()
        self.assertEqual(sketch.slug, "alice-original-title")

    def test_sketch_without_author_uses_default_prefix(self):
        sketch = Sketch.objects.create(
            title="Orphan Sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
        )
        self.assertEqual(sketch.slug, "sketches101-orphan-sketch")


@override_settings(ALLOWED_HOSTS=["testserver"])
class ProcessingPreviewViewTests(TestCase):
    def test_preview_cache_returns_embed_url_for_processing(self):
        user_model = get_user_model()
        user = user_model.objects.create_user(username="preview-user", password="secret")
        client = Client()
        client.force_login(user)

        response = client.post(
            "/accounts/sketches/preview/",
            data=json.dumps(
                {
                    "sketch_type": "processing",
                    "main_code": get_starter_code(Sketch.SketchType.PROCESSING),
                    "assets": [],
                    "mode": "live",
                    "run_id": 3,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("url", payload)

        embed_response = client.get(payload["url"])
        self.assertEqual(embed_response.status_code, 200)
        self.assertIn('id="sketch-canvas-host"', embed_response.content.decode())
        self.assertIn("new Processing(canvas", embed_response.content.decode())
        self.assertIn("void setup()", embed_response.content.decode())


class EmbedCacheTests(TestCase):
    def test_fingerprint_changes_when_code_changes(self):
        from sketches.services.embed_cache import embed_content_fingerprint

        sketch = Sketch.objects.create(
            title="Fingerprint Sketch",
            slug="fingerprint-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
        )
        first = embed_content_fingerprint(sketch)
        sketch.code = "function setup() { createCanvas(100, 100); }"
        sketch.save()
        second = embed_content_fingerprint(sketch)
        self.assertNotEqual(first, second)


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchEmbedCacheViewTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="embed-user", password="secret")
        self.sketch = Sketch.objects.create(
            title="Cached Sketch",
            slug="cached-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(100, 100); }",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        self.background = Sketch.objects.create(
            title="Background Sketch",
            slug="background-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(200, 200); }",
            status=Sketch.Status.PUBLISHED,
            is_home_background=True,
            author=self.author,
        )

    def test_published_embed_has_public_cache_headers(self):
        response = self.client.get("/sketches/cached-sketch/embed/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("public", response["Cache-Control"])
        self.assertIn("max-age=300", response["Cache-Control"])
        self.assertTrue(response["ETag"])

    def test_home_background_embed_has_longer_cache(self):
        response = self.client.get("/sketches/background-sketch/embed/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("max-age=86400", response["Cache-Control"])

    def test_published_embed_returns_304_when_etag_matches(self):
        first = self.client.get("/sketches/cached-sketch/embed/")
        etag = first["ETag"]
        second = self.client.get(
            "/sketches/cached-sketch/embed/",
            HTTP_IF_NONE_MATCH=etag,
        )
        self.assertEqual(second.status_code, 304)

    def test_draft_embed_is_not_cached(self):
        draft = Sketch.objects.create(
            title="Draft Sketch",
            slug="draft-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client.force_login(self.author)
        response = self.client.get(f"/sketches/{draft.slug}/embed/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("no-cache", response["Cache-Control"])
