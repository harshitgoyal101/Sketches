import json
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from PIL import Image

from sketches.forms import SketchDetailsForm, SketchEditForm
from sketches.models import Sketch, SketchAsset
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
from sketches.services.thumbnail_generator import (
    _prepare_embed_html_for_capture,
    _prepare_thumbnail_image,
    generate_sketch_thumbnail,
    save_sketch_thumbnail_bytes,
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
        self.assertIn("background: transparent", html)

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
        self.assertIn("pointerX()", code)
        self.assertIn("pointerY()", code)
        self.assertIn("size(screenWidth, screenHeight)", code)

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

    def test_sort_recent_param_accepted(self):
        response = self.client.get("/sketches/", {"sort": "recent"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["gallery_sort"], "recent")
        self.assertContains(response, "Recent")

    def test_type_filter_and_explore_nav_labels(self):
        response = self.client.get("/sketches/", {"type": "p5js"})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Explore")
        self.assertContains(response, 'role="dialog"')
        self.assertContains(response, "gallery-nav-close")


@override_settings(ALLOWED_HOSTS=["testserver"])
class DesignRedesignTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="maker",
            email="maker@example.com",
            password="secret",
        )
        Sketch.objects.create(
            title="Neon Grid",
            slug="maker-neon-grid",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.user,
        )
        self.client = Client()

    def test_home_renders_landing_and_stats(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Create. Code.")
        self.assertContains(response, "Experiment.")
        self.assertContains(response, "Featured Sketches")
        self.assertEqual(response.context["stats_sketch_count"], 1)
        self.assertEqual(response.context["stats_artist_count"], 1)

    def test_anonymous_mobile_menu_auth_actions(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Get started")
        self.assertContains(response, "Log in")
        self.assertContains(response, ">Explore</span>")

    def test_authenticated_mobile_menu_user_footer(self):
        self.client.force_login(self.user)
        response = self.client.get("/sketches/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "maker@example.com")
        self.assertContains(response, "My Sketches")
        self.assertContains(response, "Log out")
        self.assertContains(response, "New Sketch")

    def test_gallery_dark_shell_nav_search_and_footer(self):
        response = self.client.get("/sketches/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "gallery-nav-search")
        self.assertContains(response, "Search sketches, makers, tags")
        self.assertContains(response, "gallery-app-footer")
        self.assertContains(response, "Built for computational creatives")

    def test_auth_login_uses_dark_shell(self):
        response = self.client.get("/accounts/login/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "gallery-auth-page")
        self.assertContains(response, "auth-shell")
        self.assertContains(response, "Explore gallery")

    def test_theme_toggle_markup_present(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-theme-toggle')
        self.assertContains(response, "gallery-theme-toggle-track")
        self.assertContains(response, "theme.js")
        self.assertContains(response, "sketches101-theme")

    def test_home_renders_theme_background_sketches(self):
        Sketch.objects.create(
            title="Figma Mesh Dark",
            slug="sketches101-figma-mesh-dark",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            home_background_theme=Sketch.HomeBackgroundTheme.DARK,
            is_home_background=True,
        )
        Sketch.objects.create(
            title="Figma Mesh Light",
            slug="sketches101-figma-mesh-light",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            home_background_theme=Sketch.HomeBackgroundTheme.LIGHT,
            is_home_background=True,
        )
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-theme-bg="dark"')
        self.assertContains(response, 'data-theme-bg="light"')
        self.assertContains(response, "sketches101-figma-mesh-dark")
        self.assertContains(response, "sketches101-figma-mesh-light")
        self.assertContains(response, "data-src=")
        self.assertContains(response, "is-active")

    def test_home_landing_ide_cta_links_to_db_sketch(self):
        Sketch.objects.create(
            title="The Interactive IDE — Dark",
            slug="sketches101-interactive-ide-dark",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            landing_ide_theme=Sketch.HomeBackgroundTheme.DARK,
            is_landing_ide=True,
        )
        Sketch.objects.create(
            title="The Interactive IDE — Light",
            slug="sketches101-interactive-ide-light",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            landing_ide_theme=Sketch.HomeBackgroundTheme.LIGHT,
            is_landing_ide=True,
        )
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Open in editor")
        self.assertContains(response, 'data-landing-ide-cta')
        self.assertContains(response, 'data-sketch-slug-dark="sketches101-interactive-ide-dark"')
        self.assertContains(response, 'data-sketch-slug-light="sketches101-interactive-ide-light"')
        self.assertContains(response, reverse("landing_ide_redirect"))

    def test_landing_ide_redirect_uses_theme(self):
        Sketch.objects.create(
            title="The Interactive IDE — Dark",
            slug="sketches101-interactive-ide-dark",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            landing_ide_theme=Sketch.HomeBackgroundTheme.DARK,
            is_landing_ide=True,
        )
        Sketch.objects.create(
            title="The Interactive IDE — Light",
            slug="sketches101-interactive-ide-light",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            landing_ide_theme=Sketch.HomeBackgroundTheme.LIGHT,
            is_landing_ide=True,
        )
        dark = self.client.get("/interactive-ide/")
        self.assertRedirects(
            dark,
            "/accounts/sketches/sketches101-interactive-ide-dark/edit/",
            fetch_redirect_response=False,
        )
        light = self.client.get("/interactive-ide/?theme=light")
        self.assertRedirects(
            light,
            "/accounts/sketches/sketches101-interactive-ide-light/edit/",
            fetch_redirect_response=False,
        )
        cookie = self.client.get(
            "/interactive-ide/",
            HTTP_COOKIE="sketches101-theme=light",
        )
        self.assertRedirects(
            cookie,
            "/accounts/sketches/sketches101-interactive-ide-light/edit/",
            fetch_redirect_response=False,
        )


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
class SketchForkTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="fork-author", password="secret")
        self.visitor = user_model.objects.create_user(username="fork-visitor", password="secret")
        self.sketch = Sketch.objects.create(
            title="Original Sketch",
            slug="fork-author-original-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(200, 120); background(255); }",
            description="Original description",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        SketchAsset.objects.create(
            sketch=self.sketch,
            filename="helper.js",
            content="const helper = true;",
            asset_type=SketchAsset.AssetType.JS,
            order=0,
        )
        self.client = Client()

    def test_visitor_sees_save_fork_in_editor(self):
        self.client.force_login(self.visitor)
        response = self.client.get(f"/accounts/sketches/{self.sketch.slug}/edit/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Save fork")
        self.assertNotContains(response, "Save changes")

    def test_visitor_can_fork_without_edits(self):
        self.client.force_login(self.visitor)
        response = self.client.post(f"/accounts/sketches/{self.sketch.slug}/fork/")
        self.assertEqual(response.status_code, 302)
        fork = Sketch.objects.exclude(pk=self.sketch.pk).get(author=self.visitor)
        self.assertEqual(fork.forked_from, self.sketch)
        self.assertEqual(fork.fork_by, self.visitor)
        self.assertEqual(fork.status, Sketch.Status.DRAFT)
        self.assertEqual(fork.code, self.sketch.code)
        self.assertEqual(fork.assets.count(), 1)
        self.assertIn("Forked from", fork.description)
        self.assertIn("@fork-author", fork.description)
        self.sketch.refresh_from_db()
        self.assertEqual(self.sketch.title, "Original Sketch")

    def test_visitor_can_fork_with_edited_code(self):
        self.client.force_login(self.visitor)
        response = self.client.post(
            f"/accounts/sketches/{self.sketch.slug}/fork/",
            {
                "title": "Original Sketch (fork)",
                "entry_filename": "sketch.js",
                "code": "function setup() { createCanvas(400, 300); background(0, 0, 255); }",
                "sketch_type": "p5js",
                "assets-TOTAL_FORMS": "1",
                "assets-INITIAL_FORMS": "0",
                "assets-MIN_NUM_FORMS": "0",
                "assets-MAX_NUM_FORMS": "1000",
                "assets-0-filename": "helper.js",
                "assets-0-content": "const helper = false;",
                "assets-0-asset_type": "js",
                "assets-0-order": "0",
            },
        )
        self.assertEqual(response.status_code, 302)
        fork = Sketch.objects.exclude(pk=self.sketch.pk).get(author=self.visitor)
        self.assertIn("createCanvas(400, 300)", fork.code)
        self.assertEqual(fork.assets.get().content, "const helper = false;")
        self.sketch.refresh_from_db()
        self.assertIn("createCanvas(200, 120)", self.sketch.code)

    def test_author_cannot_fork_own_sketch(self):
        self.client.force_login(self.author)
        response = self.client.post(f"/accounts/sketches/{self.sketch.slug}/fork/")
        self.assertEqual(response.status_code, 403)

    def test_visitor_cannot_fork_draft(self):
        draft = Sketch.objects.create(
            title="Private Draft",
            slug="fork-author-private-draft",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client.force_login(self.visitor)
        response = self.client.post(f"/accounts/sketches/{draft.slug}/fork/")
        self.assertEqual(response.status_code, 403)

    def test_detail_page_shows_fork_button_for_visitor(self):
        self.client.force_login(self.visitor)
        response = self.client.get(f"/sketches/{self.sketch.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Fork")

    def test_forked_sketch_shows_attribution_on_detail_page(self):
        self.client.force_login(self.visitor)
        self.client.post(f"/accounts/sketches/{self.sketch.slug}/fork/")
        fork = Sketch.objects.exclude(pk=self.sketch.pk).get(author=self.visitor)
        fork.status = Sketch.Status.PUBLISHED
        fork.save()
        response = self.client.get(f"/sketches/{fork.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Forked from")
        self.assertContains(response, "Original Sketch")
        self.assertContains(response, "@fork-author")


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchCreateTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="create-author", password="secret")
        self.client = Client()

    def test_create_page_shows_setup_step_one(self):
        self.client.force_login(self.author)
        response = self.client.get("/accounts/sketches/new/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Continue to settings")
        self.assertContains(response, "sketch-setup-steps")

    def test_create_redirects_to_settings_setup(self):
        self.client.force_login(self.author)
        response = self.client.post(
            "/accounts/sketches/new/",
            {
                "title": "Brand New Sketch",
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
        self.assertRegex(response.url, r"/accounts/sketches/.+/settings/\?setup=1$")
        sketch = Sketch.objects.get(title="Brand New Sketch")
        self.assertEqual(sketch.author, self.author)
        follow = self.client.get(response.url)
        self.assertEqual(follow.status_code, 200)
        self.assertContains(follow, "Step 2 · Sketch details")
        self.assertContains(follow, 'data-auto-generate-thumbnail="true"')


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
        self.assertContains(response, "Sketch Settings")
        self.assertContains(response, "sketch-description-input")
        self.assertNotContains(response, "code-editor")

    def test_visitor_cannot_open_settings_page(self):
        self.client.force_login(self.other)
        response = self.client.get("/accounts/sketches/my-sketch/settings/")
        self.assertEqual(response.status_code, 403)

    @patch("sketches.views_manage.schedule_sketch_thumbnail_generation")
    def test_author_can_save_description(self, schedule_mock):
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

    @patch("sketches.views_manage.schedule_sketch_thumbnail_generation")
    def test_save_settings_generates_thumbnail_when_missing(self, schedule_mock):
        self.client.force_login(self.author)
        response = self.client.post(
            "/accounts/sketches/my-sketch/settings/",
            {
                "title": "My Sketch",
                "description": "Updated description",
            },
        )
        self.assertEqual(response.status_code, 302)
        schedule_mock.assert_called_once_with(self.sketch)

    def test_upload_thumbnail_endpoint(self):
        self.client.force_login(self.author)
        buffer = BytesIO()
        Image.new("RGB", (200, 120), color="#3B82F6").save(buffer, format="PNG")
        buffer.seek(0)
        response = self.client.post(
            "/accounts/sketches/my-sketch/settings/upload-thumbnail/",
            {"image": SimpleUploadedFile("thumb.png", buffer.read(), content_type="image/png")},
            HTTP_ACCEPT="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.sketch.refresh_from_db()
        self.assertTrue(self.sketch.thumbnail)

    def test_settings_page_shows_generate_thumbnail_button(self):
        self.client.force_login(self.author)
        response = self.client.get("/accounts/sketches/my-sketch/settings/")
        self.assertContains(response, "Generate from preview")


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
        self.assertIn("html", payload)
        self.assertIn("new Processing(canvas", payload["html"])

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


class ThumbnailGeneratorTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="thumb-user", password="secret")
        self.sketch = Sketch.objects.create(
            title="Thumb Sketch",
            slug="thumb-user-thumb-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(200, 120); background(255); }",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )

    def _sample_png(self):
        buffer = BytesIO()
        Image.new("RGB", (200, 120), color="#3B82F6").save(buffer, format="PNG")
        return buffer.getvalue()

    def test_prepare_embed_html_injects_capture_script(self):
        html = _prepare_embed_html_for_capture(self.sketch)
        self.assertIn("__SKETCH_THUMBNAIL_READY__", html)
        self.assertIn("function setup()", html)
        self.assertIn("background: transparent", html)

    def test_prepare_thumbnail_image_covers_target_size(self):
        processed = _prepare_thumbnail_image(self._sample_png(), (1280, 720))
        image = Image.open(BytesIO(processed))
        self.assertEqual(image.size, (1280, 720))
        self.assertEqual(image.format, "WEBP")

    def test_prepare_thumbnail_image_scales_up_small_canvas(self):
        buffer = BytesIO()
        Image.new("RGB", (200, 120), color="#3B82F6").save(buffer, format="PNG")
        processed = _prepare_thumbnail_image(buffer.getvalue(), (1280, 720))
        image = Image.open(BytesIO(processed))
        self.assertEqual(image.size, (1280, 720))
        # Cover-crop fills the frame — no light/dark letterbox bars at the edges.
        pixels = image.load()
        self.assertNotEqual(pixels[0, 0], (13, 13, 13))
        self.assertNotEqual(pixels[1279, 719], (13, 13, 13))
        # Roughly the source blue after WebP encode.
        self.assertGreater(pixels[0, 0][2], 200)

    def test_prepare_thumbnail_image_scales_down_large_canvas(self):
        buffer = BytesIO()
        Image.new("RGB", (2400, 1200), color="#3B82F6").save(buffer, format="PNG")
        processed = _prepare_thumbnail_image(buffer.getvalue(), (1280, 720))
        image = Image.open(BytesIO(processed))
        self.assertEqual(image.size, (1280, 720))

    @patch("sketches.services.thumbnail_generator._capture_canvas_png")
    def test_generate_sketch_thumbnail_saves_image(self, capture_mock):
        capture_mock.return_value = self._sample_png()
        generated = generate_sketch_thumbnail(self.sketch)
        self.assertTrue(generated)
        self.sketch.refresh_from_db()
        self.assertTrue(self.sketch.thumbnail)
        self.assertTrue(self.sketch.thumbnail.name.endswith(".webp"))
        self.assertIn("640w", self.sketch.thumbnail_srcset)

    def test_save_sketch_thumbnail_bytes(self):
        saved = save_sketch_thumbnail_bytes(self.sketch, self._sample_png(), force=True)
        self.assertTrue(saved)
        self.sketch.refresh_from_db()
        self.assertTrue(self.sketch.thumbnail)
        self.assertTrue(self.sketch.thumbnail.name.endswith(".webp"))
        self.assertTrue(self.sketch.thumbnail_card_url)

    @patch("sketches.services.thumbnail_generator._capture_canvas_png")
    def test_generate_sketch_thumbnail_skips_existing_thumbnail(self, capture_mock):
        self.sketch.thumbnail.save(
            "existing.png",
            SimpleUploadedFile("existing.png", self._sample_png(), content_type="image/png"),
            save=True,
        )
        generated = generate_sketch_thumbnail(self.sketch)
        self.assertFalse(generated)
        capture_mock.assert_not_called()

    @patch("sketches.services.thumbnail_generator._capture_canvas_png")
    def test_generate_sketch_thumbnail_force_regenerates(self, capture_mock):
        capture_mock.return_value = self._sample_png()
        self.sketch.thumbnail.save(
            "existing.png",
            SimpleUploadedFile("existing.png", self._sample_png(), content_type="image/png"),
            save=True,
        )
        generated = generate_sketch_thumbnail(self.sketch, force=True)
        self.assertTrue(generated)
        capture_mock.assert_called_once()


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchPublishThumbnailTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="publisher", password="secret")
        self.sketch = Sketch.objects.create(
            title="Publish Me",
            slug="publisher-publish-me",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(100, 100); }",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client = Client()
        self.client.force_login(self.author)

    @patch("sketches.services.sketch_publish.schedule_sketch_thumbnail_generation")
    def test_publish_endpoint_generates_thumbnail(self, schedule_mock):
        response = self.client.post(f"/accounts/sketches/{self.sketch.slug}/publish/")
        self.assertEqual(response.status_code, 302)
        self.sketch.refresh_from_db()
        self.assertEqual(self.sketch.status, Sketch.Status.PUBLISHED)
        schedule_mock.assert_called_once_with(self.sketch)

    @patch("sketches.views_manage.schedule_sketch_thumbnail_generation")
    def test_edit_publish_action_generates_thumbnail(self, schedule_mock):
        response = self.client.post(
            f"/accounts/sketches/{self.sketch.slug}/edit/",
            {
                "action": "publish",
                "title": "Publish Me",
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
        self.assertEqual(self.sketch.status, Sketch.Status.PUBLISHED)
        schedule_mock.assert_called_once_with(self.sketch)


@override_settings(ALLOWED_HOSTS=["testserver"])
class SketchApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(username="api-user", password="secret")
        self.sketch = Sketch.objects.create(
            title="API Orbit",
            slug="api-orbit",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
            description="Public sketch for API tests",
        )
        Sketch.objects.create(
            title="Hidden Draft",
            slug="hidden-draft",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.author,
        )
        self.client = Client()

    def test_api_home_returns_featured(self):
        response = self.client.get("/api/home/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("featured", payload)
        self.assertIn("stats", payload)
        self.assertIn("background", payload)
        self.assertIn("dark", payload["background"])
        self.assertIn("light", payload["background"])
        slugs = [item["slug"] for item in payload["featured"]]
        self.assertIn("api-orbit", slugs)
        self.assertNotIn("hidden-draft", slugs)

    def test_api_sketch_list_excludes_drafts(self):
        response = self.client.get("/api/sketches/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        slugs = [item["slug"] for item in payload["results"]]
        self.assertIn("api-orbit", slugs)
        self.assertNotIn("hidden-draft", slugs)
        self.assertEqual(payload["total"], 1)

    def test_api_sketch_list_sort_random_and_exclude(self):
        Sketch.objects.create(
            title="API Pulse",
            slug="api-pulse",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        response = self.client.get("/api/sketches/", {"sort": "random"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["filters"]["sort"], "random")
        self.assertGreaterEqual(response.json()["total"], 2)

        excluded = self.client.get(
            "/api/sketches/",
            {"sort": "random", "exclude": "api-orbit"},
        )
        self.assertEqual(excluded.status_code, 200)
        slugs = [item["slug"] for item in excluded.json()["results"]]
        self.assertNotIn("api-orbit", slugs)
        self.assertIn("api-pulse", slugs)

    def test_api_sketch_detail(self):
        response = self.client.get("/api/sketches/api-orbit/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["slug"], "api-orbit")
        self.assertEqual(payload["sketch_type"], "p5js")
        self.assertEqual(payload["author"]["username"], "api-user")
        self.assertIn("embed_url", payload)
        self.assertIn("code", payload)
        self.assertIn("related", payload)
        self.assertIn("forks", payload)

    def test_api_sketch_detail_related_and_forks(self):
        from sketches.models import Tag

        tag = Tag.objects.create(name="Noise", slug="noise")
        self.sketch.tags.add(tag)
        peer = Sketch.objects.create(
            title="API Peer",
            slug="api-peer",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        peer.tags.add(tag)
        remix = Sketch.objects.create(
            title="API Remix",
            slug="api-remix",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
            forked_from=self.sketch,
        )
        Sketch.objects.create(
            title="Draft Remix",
            slug="draft-remix",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.author,
            forked_from=self.sketch,
        )

        response = self.client.get("/api/sketches/api-orbit/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        related_slugs = [item["slug"] for item in payload["related"]]
        self.assertIn("api-peer", related_slugs)
        self.assertNotIn("api-orbit", related_slugs)
        fork_slugs = [item["slug"] for item in payload["forks"]]
        self.assertIn(remix.slug, fork_slugs)
        self.assertNotIn("draft-remix", fork_slugs)

    def test_api_sketch_detail_draft_404_for_anonymous(self):
        response = self.client.get("/api/sketches/hidden-draft/")
        self.assertEqual(response.status_code, 404)

    def test_api_formats_and_tags(self):
        formats = self.client.get("/api/formats/")
        self.assertEqual(formats.status_code, 200)
        self.assertIn("results", formats.json())
        tags = self.client.get("/api/tags/")
        self.assertEqual(tags.status_code, 200)
        self.assertIn("results", tags.json())

    def test_api_maker_profile_public_published_only(self):
        from sketches.models import UserProfile

        UserProfile.objects.update_or_create(
            user=self.author,
            defaults={"display_name": "API Maker"},
        )
        response = self.client.get("/api/makers/api-user/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["username"], "api-user")
        self.assertEqual(payload["display_name"], "API Maker")
        self.assertEqual(payload["sketch_count"], 1)
        slugs = [item["slug"] for item in payload["sketches"]]
        self.assertIn("api-orbit", slugs)
        self.assertNotIn("hidden-draft", slugs)

        missing = self.client.get("/api/makers/nobody-here/")
        self.assertEqual(missing.status_code, 404)

    def test_api_explore_today_returns_published_pick(self):
        response = self.client.get("/api/explore/today/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("date", payload)
        self.assertIsNotNone(payload["sketch"])
        self.assertEqual(payload["sketch"]["slug"], "api-orbit")
        self.assertIsInstance(payload["previous"], list)

        again = self.client.get("/api/explore/today/").json()
        self.assertEqual(again["sketch"]["slug"], payload["sketch"]["slug"])
        self.assertEqual(again["date"], payload["date"])

    def test_api_challenge_current(self):
        from datetime import date, timedelta

        from sketches.models import Tag, WeeklyChallenge

        tag = Tag.objects.create(name="Challenge Tag", slug="challenge-tag")
        self.sketch.tags.add(tag)
        today = date.today()
        WeeklyChallenge.objects.create(
            title="Wave forms",
            slug="wave-forms",
            prompt="Oscillate something beautiful.",
            tag=tag,
            starts_on=today - timedelta(days=1),
            ends_on=today + timedelta(days=5),
            is_active=True,
        )
        response = self.client.get("/api/challenges/current/")
        self.assertEqual(response.status_code, 200)
        challenge = response.json()["challenge"]
        self.assertIsNotNone(challenge)
        self.assertEqual(challenge["slug"], "wave-forms")
        self.assertEqual(challenge["tag"]["slug"], "challenge-tag")
        self.assertGreaterEqual(challenge["entry_count"], 1)


@override_settings(ALLOWED_HOSTS=["testserver"])
class GameSketchApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(
            username="game-author", password="secret"
        )
        self.visitor = user_model.objects.create_user(
            username="game-visitor", password="secret"
        )
        self.sketch = Sketch.objects.create(
            title="Normal Sketch",
            slug="normal-sketch",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(100, 100); }",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        self.game = Sketch.objects.create(
            title="Finger Game",
            slug="finger-game",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(200, 200); }",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
            is_game=True,
            entry_filename="sketch.js",
        )
        self.client = Client()

    def test_gallery_list_excludes_games(self):
        response = self.client.get("/api/sketches/")
        self.assertEqual(response.status_code, 200)
        slugs = [item["slug"] for item in response.json()["results"]]
        self.assertIn("normal-sketch", slugs)
        self.assertNotIn("finger-game", slugs)

    def test_games_list_returns_only_games(self):
        response = self.client.get("/api/sketches/", {"games": "1"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        slugs = [item["slug"] for item in payload["results"]]
        self.assertEqual(slugs, ["finger-game"])
        self.assertTrue(payload["filters"]["games"])
        self.assertTrue(payload["results"][0]["is_game"])
        self.assertEqual(payload["results"][0]["scoreboard_slug"], "finger-game")

    def test_scoreboard_slug_defaults_and_override(self):
        self.game.scoreboard_slug = "orbit-run"
        self.game.save(update_fields=["scoreboard_slug"])
        response = self.client.get("/api/sketches/finger-game/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["scoreboard_slug"], "orbit-run")

    def test_public_game_detail_omits_source(self):
        response = self.client.get("/api/sketches/finger-game/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["is_game"])
        self.assertEqual(payload["code"], "")
        self.assertEqual(payload["files"], [])
        self.assertFalse(payload["can_fork"])
        self.assertFalse(payload["can_edit"])
        self.assertIn("embed_url", payload)

    def test_game_cannot_be_forked(self):
        self.client.force_login(self.visitor)
        response = self.client.post(f"/api/sketches/{self.game.slug}/fork/")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            Sketch.objects.filter(forked_from=self.game, author=self.visitor).exists()
        )

    def test_owner_can_toggle_is_game_in_settings(self):
        self.client.force_login(self.author)
        response = self.client.patch(
            f"/api/account/sketches/{self.sketch.slug}/settings/",
            data=json.dumps(
                {
                    "title": self.sketch.title,
                    "description": self.sketch.description or "",
                    "tags": [],
                    "is_game": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.sketch.refresh_from_db()
        self.assertTrue(self.sketch.is_game)
        self.assertTrue(response.json()["sketch"]["is_game"])
        self.assertEqual(self.sketch.scoreboard_slug, self.sketch.slug)
        from sketches.models import Game

        self.assertTrue(
            Game.objects.filter(slug=self.sketch.slug, is_active=True).exists()
        )
        scores = self.client.get(f"/api/games/{self.sketch.slug}/scores/")
        self.assertEqual(scores.status_code, 200)

    def test_visitor_cannot_manage_game(self):
        self.client.force_login(self.visitor)
        detail = self.client.get(f"/api/account/sketches/{self.game.slug}/")
        self.assertEqual(detail.status_code, 403)
        settings = self.client.get(
            f"/api/account/sketches/{self.game.slug}/settings/"
        )
        self.assertEqual(settings.status_code, 403)
        source = self.client.post(
            f"/api/account/sketches/{self.game.slug}/source/",
            data=json.dumps(
                {
                    "title": "Hacked",
                    "entry_filename": "sketch.js",
                    "files": [
                        {
                            "filename": "sketch.js",
                            "content": "function setup() {}",
                            "is_main": True,
                            "asset_id": None,
                            "asset_type": "js",
                        }
                    ],
                    "deleted_asset_ids": [],
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(source.status_code, 403)
        self.game.refresh_from_db()
        self.assertEqual(self.game.title, "Finger Game")

    def test_owner_can_manage_game(self):
        self.client.force_login(self.author)
        detail = self.client.get(f"/api/account/sketches/{self.game.slug}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.json()["can_edit"])
        self.assertIn("createCanvas", detail.json()["code"])

    def test_staff_can_manage_others_game(self):
        self.visitor.is_staff = True
        self.visitor.save(update_fields=["is_staff"])
        self.client.force_login(self.visitor)
        detail = self.client.get(f"/api/account/sketches/{self.game.slug}/")
        self.assertEqual(detail.status_code, 200)
        self.assertTrue(detail.json()["can_edit"])

    def test_owner_public_game_detail_shows_can_edit(self):
        self.client.force_login(self.author)
        response = self.client.get("/api/sketches/finger-game/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["can_edit"])
        self.assertEqual(payload["code"], "")
        self.assertFalse(payload["can_fork"])


@override_settings(ALLOWED_HOSTS=["testserver"])
class AuthApiTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="authuser",
            email="auth@example.com",
            password="test-password",
        )
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        self.client = Client()

    def test_csrf_and_me_anonymous(self):
        csrf = self.client.get("/api/auth/csrf/")
        self.assertEqual(csrf.status_code, 200)
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertIsNone(me.json()["user"])

    def test_login_with_email_and_logout(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps(
                {
                    "username": "auth@example.com",
                    "password": "test-password",
                    "remember": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["user"]["username"], "authuser")

        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.json()["user"]["username"], "authuser")

        logout = self.client.post(
            "/api/auth/logout/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(logout.status_code, 200)
        self.assertIsNone(self.client.get("/api/auth/me/").json()["user"])

    def test_login_rejects_bad_password(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "authuser", "password": "wrong"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    @patch("sketches.api.auth_views.send_verification_email")
    def test_signup_requires_verification(self, send_mail_mock):
        response = self.client.post(
            "/api/auth/signup/",
            data=json.dumps(
                {
                    "username": "newbie",
                    "email": "newbie@example.com",
                    "password1": "Sketch@42",
                    "password2": "Sketch@42",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["verification_required"])
        send_mail_mock.assert_called_once()
        created = get_user_model().objects.get(username="newbie")
        self.assertFalse(created.is_active)

    def test_account_sketches_requires_auth(self):
        response = self.client.get("/api/account/sketches/")
        self.assertEqual(response.status_code, 401)

    def test_account_sketches_lists_own(self):
        Sketch.objects.create(
            title="Mine",
            slug="authuser-mine",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.user,
        )
        self.client.force_login(self.user)
        response = self.client.get("/api/account/sketches/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["draft_count"], 1)
        self.assertEqual(payload["results"][0]["slug"], "authuser-mine")

    def test_account_sketches_401_includes_auth_required_code(self):
        response = self.client.get("/api/account/sketches/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json().get("code"), "auth_required")

    def test_migrate_guest_requires_auth(self):
        response = self.client.post(
            "/api/auth/migrate-guest/",
            data=json.dumps({"guest_id": "g-1", "drafts": []}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json().get("code"), "auth_required")

    def test_migrate_guest_creates_drafts_and_is_idempotent(self):
        self.client.force_login(self.user)
        body = {
            "guest_id": "guest-abc",
            "display_name": "Ada Lovelace",
            "drafts": [
                {
                    "client_id": "draft-1",
                    "title": "Guest Orbit",
                    "sketch_type": "p5js",
                    "entry_filename": "sketch.js",
                    "files": [
                        {
                            "filename": "sketch.js",
                            "content": "function setup() {}",
                            "is_main": True,
                            "asset_type": "js",
                        }
                    ],
                }
            ],
        }
        first = self.client.post(
            "/api/auth/migrate-guest/",
            data=json.dumps(body),
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 200)
        payload = first.json()
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["idempotent"])
        self.assertEqual(len(payload["sketches"]), 1)
        self.assertEqual(payload["sketches"][0]["client_id"], "draft-1")
        slug = payload["sketches"][0]["slug"]
        sketch = Sketch.objects.get(slug=slug)
        self.assertEqual(sketch.author_id, self.user.pk)
        self.assertEqual(sketch.status, Sketch.Status.DRAFT)
        self.assertEqual(sketch.code, "function setup() {}")
        self.assertEqual(self.user.profile.display_name, "Ada Lovelace")

        second = self.client.post(
            "/api/auth/migrate-guest/",
            data=json.dumps(body),
            content_type="application/json",
        )
        self.assertEqual(second.status_code, 200)
        again = second.json()
        self.assertTrue(again["idempotent"])
        self.assertEqual(again["sketches"][0]["slug"], slug)
        self.assertEqual(
            Sketch.objects.filter(author=self.user, title="Guest Orbit").count(),
            1,
        )

    def test_migrate_guest_imports_scores_and_pending_forks(self):
        from sketches.models import Game, GameScore

        Game.objects.get_or_create(
            slug="orbit-run",
            defaults={"title": "Orbit Run", "max_score": 1_000_000},
        )
        source = Sketch.objects.create(
            title="Public Source",
            slug="authuser-public-source",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=self.user,
        )
        other = get_user_model().objects.create_user(
            username="migrator",
            email="migrator@example.com",
            password="test-password",
        )
        other.is_active = True
        other.save(update_fields=["is_active"])
        self.client.force_login(other)
        body = {
            "guest_id": "guest-scores-1",
            "display_name": "Scorer",
            "drafts": [],
            "scores": [
                {
                    "game": "orbit-run",
                    "score": 1200,
                    "played_at": "2026-07-01T12:00:00Z",
                    "meta": {"wave": 3},
                }
            ],
            "pending_forks": [{"source_slug": source.slug, "files": []}],
        }
        response = self.client.post(
            "/api/auth/migrate-guest/",
            data=json.dumps(body),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["scores_imported"], 1)
        self.assertEqual(len(payload["forks"]), 1)
        self.assertTrue(
            GameScore.objects.filter(
                user=other, game__slug="orbit-run", score=1200
            ).exists()
        )
        fork_slug = payload["forks"][0]["slug"]
        self.assertTrue(
            Sketch.objects.filter(
                slug=fork_slug, author=other, forked_from=source
            ).exists()
        )

    @patch("sketches.api.auth_views.verify_google_id_token")
    def test_google_auth_creates_user_and_session(self, verify_mock):
        verify_mock.return_value = {
            "iss": "https://accounts.google.com",
            "email": "google.user@example.com",
            "email_verified": True,
            "name": "Google User",
            "given_name": "Google",
        }
        response = self.client.post(
            "/api/auth/google/",
            data=json.dumps({"credential": "fake-token"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["created"])
        self.assertEqual(payload["user"]["email"], "google.user@example.com")
        me = self.client.get("/api/auth/me/").json()
        self.assertEqual(me["user"]["email"], "google.user@example.com")
        self.assertEqual(me["user"]["display_name"], "Google User")

    def test_game_score_requires_auth_and_respects_cap(self):
        from sketches.models import Game

        Game.objects.get_or_create(
            slug="orbit-run",
            defaults={"title": "Orbit Run", "max_score": 100},
        )
        Game.objects.filter(slug="orbit-run").update(max_score=100)
        anon = self.client.post(
            "/api/games/orbit-run/scores/",
            data=json.dumps({"score": 10}),
            content_type="application/json",
        )
        self.assertEqual(anon.status_code, 401)

        self.client.force_login(self.user)
        ok = self.client.post(
            "/api/games/orbit-run/scores/",
            data=json.dumps({"score": 42}),
            content_type="application/json",
        )
        self.assertEqual(ok.status_code, 201)
        self.assertTrue(ok.json()["is_personal_best"])

        too_high = self.client.post(
            "/api/games/orbit-run/scores/",
            data=json.dumps({"score": 999}),
            content_type="application/json",
        )
        self.assertEqual(too_high.status_code, 400)

    def test_enforce_rate_limit_helper(self):
        import json as json_lib

        from django.core.cache import cache

        from sketches.api.http import enforce_rate_limit

        cache.clear()
        key = "test:rl:helper"
        for _ in range(3):
            self.assertIsNone(
                enforce_rate_limit(key, limit=3, window_seconds=60)
            )
        blocked = enforce_rate_limit(key, limit=3, window_seconds=60)
        self.assertIsNotNone(blocked)
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(
            json_lib.loads(blocked.content).get("code"), "rate_limited"
        )

    def test_migrate_guest_rate_limited(self):
        from django.core.cache import cache

        cache.clear()
        self.client.force_login(self.user)
        for i in range(10):
            response = self.client.post(
                "/api/auth/migrate-guest/",
                data=json.dumps(
                    {
                        "guest_id": f"guest-rl-{i}",
                        "display_name": "Ada",
                        "drafts": [],
                        "scores": [],
                        "pending_forks": [],
                    }
                ),
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 200, msg=f"call {i}")
        blocked = self.client.post(
            "/api/auth/migrate-guest/",
            data=json.dumps(
                {
                    "guest_id": "guest-rl-overflow",
                    "display_name": "Ada",
                    "drafts": [],
                    "scores": [],
                    "pending_forks": [],
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(blocked.status_code, 429)
        self.assertEqual(blocked.json().get("code"), "rate_limited")


@override_settings(ALLOWED_HOSTS=["testserver"])
class ManageApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="maker",
            email="maker@example.com",
            password="test-password",
        )
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        self.client = Client()
        self.client.force_login(self.user)

    def test_create_sketch_applies_starter(self):
        response = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Fresh Orbit", "sketch_type": "p5js"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        sketch = payload["sketch"]
        self.assertEqual(sketch["title"], "Fresh Orbit")
        self.assertEqual(sketch["status"], "draft")
        self.assertEqual(sketch["sketch_type"], "p5js")
        self.assertEqual(sketch["entry_filename"], "sketch.js")
        self.assertIn("function setup", sketch["code"])
        self.assertTrue(sketch["slug"].startswith("maker-"))

    def test_owner_can_delete_sketch(self):
        create = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Temp", "sketch_type": "p5js"}),
            content_type="application/json",
        )
        slug = create.json()["sketch"]["slug"]
        deleted = self.client.delete(f"/api/account/sketches/{slug}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.json()["ok"])
        self.assertEqual(deleted.json()["deleted"], slug)
        self.assertFalse(Sketch.objects.filter(slug=slug).exists())

    def test_owner_can_delete_game(self):
        create = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Temp Game", "sketch_type": "p5js"}),
            content_type="application/json",
        )
        slug = create.json()["sketch"]["slug"]
        self.client.patch(
            f"/api/account/sketches/{slug}/settings/",
            data=json.dumps(
                {
                    "title": "Temp Game",
                    "description": "",
                    "tags": [],
                    "is_game": True,
                }
            ),
            content_type="application/json",
        )
        deleted = self.client.delete(f"/api/account/sketches/{slug}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.json()["was_game"])
        self.assertFalse(Sketch.objects.filter(slug=slug).exists())

    def test_non_owner_cannot_delete_sketch(self):
        create = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Keep", "sketch_type": "p5js"}),
            content_type="application/json",
        )
        slug = create.json()["sketch"]["slug"]
        other = get_user_model().objects.create_user(
            username="other", password="test-password"
        )
        other_client = Client()
        other_client.force_login(other)
        denied = other_client.delete(f"/api/account/sketches/{slug}/")
        self.assertEqual(denied.status_code, 403)
        self.assertTrue(Sketch.objects.filter(slug=slug).exists())

    def test_staff_can_delete_others_sketch(self):
        create = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Staff delete", "sketch_type": "p5js"}),
            content_type="application/json",
        )
        slug = create.json()["sketch"]["slug"]
        staff = get_user_model().objects.create_user(
            username="staffer", password="test-password", is_staff=True
        )
        staff_client = Client()
        staff_client.force_login(staff)
        deleted = staff_client.delete(f"/api/account/sketches/{slug}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(Sketch.objects.filter(slug=slug).exists())

    def test_patch_source_and_settings_then_publish(self):
        create = self.client.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Editable", "sketch_type": "processing"}),
            content_type="application/json",
        )
        slug = create.json()["sketch"]["slug"]

        patched = self.client.patch(
            f"/api/account/sketches/{slug}/",
            data=json.dumps(
                {
                    "title": "Editable Renamed",
                    "entry_filename": "main.pde",
                    "code": "void setup() { size(100, 100); }",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(patched.status_code, 200)
        self.assertEqual(patched.json()["sketch"]["title"], "Editable Renamed")
        self.assertEqual(patched.json()["sketch"]["entry_filename"], "main.pde")

        from sketches.models import Tag

        tag = Tag.objects.create(name="Motion", slug="motion")
        with patch(
            "sketches.api.manage_views.schedule_sketch_thumbnail_generation"
        ) as schedule_mock:
            settings_resp = self.client.patch(
                f"/api/account/sketches/{slug}/settings/",
                data=json.dumps(
                    {
                        "title": "Editable Renamed",
                        "description": "A short note",
                        "tags": [tag.slug],
                    }
                ),
                content_type="application/json",
            )
            self.assertEqual(settings_resp.status_code, 200)
            schedule_mock.assert_called()
        settings_payload = settings_resp.json()["sketch"]
        self.assertEqual(settings_payload["description"], "A short note")
        self.assertEqual(settings_payload["tags"][0]["slug"], "motion")

        with patch(
            "sketches.services.sketch_publish.schedule_sketch_thumbnail_generation"
        ):
            published = self.client.post(
                f"/api/account/sketches/{slug}/publish/",
                data=json.dumps({}),
                content_type="application/json",
            )
        self.assertEqual(published.status_code, 200)
        self.assertEqual(published.json()["sketch"]["status"], "published")

    def test_create_requires_auth(self):
        anon = Client()
        response = anon.post(
            "/api/account/sketches/",
            data=json.dumps({"title": "Nope"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    @patch("sketches.api.manage_views.save_sketch_thumbnail_bytes", return_value=True)
    def test_thumbnail_upload(self, save_mock):
        sketch = Sketch.objects.create(
            title="Thumb Me",
            slug="maker-thumb-me",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.user,
        )
        image = SimpleUploadedFile(
            "thumb.png",
            b"\x89PNG\r\n\x1a\n" + b"0" * 64,
            content_type="image/png",
        )
        # Force refresh path after "save"
        sketch.thumbnail = SimpleUploadedFile(
            "stored.webp", b"webpdata", content_type="image/webp"
        )
        sketch.save()

        response = self.client.post(
            f"/api/account/sketches/{sketch.slug}/thumbnail/",
            {"image": image},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        save_mock.assert_called_once()

    @patch("sketches.api.manage_views.save_sketch_app_icon_bytes", return_value=True)
    def test_app_icon_upload(self, save_mock):
        sketch = Sketch.objects.create(
            title="Icon Me",
            slug="maker-icon-me",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.DRAFT,
            author=self.user,
        )
        image = SimpleUploadedFile(
            "icon.png",
            b"\x89PNG\r\n\x1a\n" + b"0" * 64,
            content_type="image/png",
        )
        sketch.app_icon = SimpleUploadedFile(
            "stored-icon.webp", b"webpdata", content_type="image/webp"
        )
        sketch.save()

        response = self.client.post(
            f"/api/account/sketches/{sketch.slug}/app-icon/",
            {"image": image},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertIn("app_icon", payload)
        save_mock.assert_called_once()


@override_settings(ALLOWED_HOSTS=["testserver"])
class IdeApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.author = user_model.objects.create_user(
            username="ide-author",
            email="ide@example.com",
            password="test-password",
        )
        self.author.is_active = True
        self.author.save(update_fields=["is_active"])
        self.other = user_model.objects.create_user(
            username="ide-fan",
            email="fan@example.com",
            password="test-password",
        )
        self.other.is_active = True
        self.other.save(update_fields=["is_active"])
        self.sketch = Sketch.objects.create(
            title="Live Orbit",
            slug="ide-author-live-orbit",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() { createCanvas(100, 100); }",
            entry_filename="sketch.js",
            status=Sketch.Status.PUBLISHED,
            author=self.author,
        )
        SketchAsset.objects.create(
            sketch=self.sketch,
            filename="helper.js",
            content="const helper = true;",
            asset_type=SketchAsset.AssetType.JS,
            order=0,
        )
        self.client = Client()
        self.client.force_login(self.author)

    def test_preview_returns_embed_url(self):
        response = self.client.post(
            "/api/preview/",
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
        payload = response.json()
        url = payload["url"]
        self.assertTrue(url.startswith("/accounts/sketches/preview/"))
        self.assertIn("html", payload)
        self.assertIn("function setup", payload["html"])
        embed = self.client.get(url)
        self.assertEqual(embed.status_code, 200)
        self.assertIn("function setup", embed.content.decode())

    def test_source_save_creates_and_deletes_assets(self):
        response = self.client.post(
            f"/api/account/sketches/{self.sketch.slug}/source/",
            data=json.dumps(
                {
                    "title": "Live Orbit",
                    "entry_filename": "sketch.js",
                    "files": [
                        {
                            "filename": "sketch.js",
                            "content": "function setup() { background(0); }",
                            "is_main": True,
                            "asset_id": None,
                            "asset_type": "js",
                        },
                        {
                            "filename": "helper.js",
                            "content": "const helper = 2;",
                            "is_main": False,
                            "asset_id": self.sketch.assets.get(filename="helper.js").pk,
                            "asset_type": "js",
                        },
                        {
                            "filename": "extra.js",
                            "content": "const extra = true;",
                            "is_main": False,
                            "asset_id": None,
                            "asset_type": "js",
                        },
                    ],
                    "deleted_asset_ids": [],
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()["sketch"]
        self.assertIn("background(0)", payload["code"])
        filenames = {f["filename"] for f in payload["files"]}
        self.assertEqual(filenames, {"sketch.js", "helper.js", "extra.js"})

        helper_id = next(f["asset_id"] for f in payload["files"] if f["filename"] == "helper.js")
        extra_id = next(f["asset_id"] for f in payload["files"] if f["filename"] == "extra.js")
        deleted = self.client.post(
            f"/api/account/sketches/{self.sketch.slug}/source/",
            data=json.dumps(
                {
                    "files": [
                        {
                            "filename": "sketch.js",
                            "content": payload["code"],
                            "is_main": True,
                        },
                        {
                            "filename": "extra.js",
                            "content": "const extra = true;",
                            "is_main": False,
                            "asset_id": extra_id,
                            "asset_type": "js",
                        },
                    ],
                    "deleted_asset_ids": [helper_id],
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(deleted.status_code, 200)
        names = {f["filename"] for f in deleted.json()["sketch"]["files"]}
        self.assertEqual(names, {"sketch.js", "extra.js"})

    def test_fork_from_other_user(self):
        fan = Client()
        fan.force_login(self.other)
        response = fan.post(
            f"/api/sketches/{self.sketch.slug}/fork/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        fork = response.json()["sketch"]
        self.assertEqual(fork["status"], "draft")
        self.assertTrue(fork["can_edit"])
        self.assertEqual(fork["forked_from"]["slug"], self.sketch.slug)
        self.assertEqual(len(fork["files"]), 2)


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    ROOT_URLCONF="sketch_gallery.urls",
)
class SpaServeTests(TestCase):
    def setUp(self):
        self.client = Client()
        self._tmpdir = Path(settings.BASE_DIR) / ".tmp_spa_test"
        self._tmpdir.mkdir(parents=True, exist_ok=True)
        (self._tmpdir / "index.html").write_text(
            "<!doctype html><html><body>SPA</body></html>",
            encoding="utf-8",
        )
        (self._tmpdir / "asset.txt").write_text("hello", encoding="utf-8")
        self._override = override_settings(SPA_DIR=self._tmpdir)
        self._override.enable()

    def tearDown(self):
        self._override.disable()
        for child in self._tmpdir.iterdir():
            child.unlink()
        self._tmpdir.rmdir()

    def test_spa_index_and_fallback(self):
        index = self.client.get("/")
        self.assertEqual(index.status_code, 200)
        self.assertIn(b"SPA", index.content)

        fallback = self.client.get("/gallery")
        self.assertEqual(fallback.status_code, 200)
        self.assertIn(b"SPA", fallback.content)

        asset = self.client.get("/asset.txt")
        self.assertEqual(asset.status_code, 200)
        self.assertEqual(b"".join(asset.streaming_content), b"hello")

        legacy = self.client.get("/app/gallery")
        self.assertEqual(legacy.status_code, 302)
        self.assertEqual(legacy["Location"], "/gallery")


@override_settings(ALLOWED_HOSTS=["testserver"])
class PasswordResetApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="resetme",
            email="resetme@example.com",
            password="OldPass@42",
        )
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        self.client = Client()

    @patch("sketches.api.auth_views.StyledPasswordResetForm.save")
    def test_password_reset_request_always_ok(self, save_mock):
        response = self.client.post(
            "/api/auth/password-reset/",
            data=json.dumps({"email": "resetme@example.com"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        save_mock.assert_called_once()

    def test_password_reset_confirm(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            data=json.dumps(
                {
                    "uid": uid,
                    "token": token,
                    "password1": "NewPass@99",
                    "password2": "NewPass@99",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass@99"))


@override_settings(ALLOWED_HOSTS=["testserver"])
class GalleryTagApiTests(TestCase):
    def setUp(self):
        from sketches.models import Tag

        user_model = get_user_model()
        author = user_model.objects.create_user(username="tagger", password="secret")
        self.tag = Tag.objects.create(name="Neon", slug="neon", is_active=True)
        other = Tag.objects.create(name="Quiet", slug="quiet", is_active=True)
        matched = Sketch.objects.create(
            title="Neon Drift",
            slug="tagger-neon-drift",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=author,
        )
        matched.tags.add(self.tag)
        Sketch.objects.create(
            title="Quiet Lake",
            slug="tagger-quiet-lake",
            sketch_type=Sketch.SketchType.P5JS,
            code="function setup() {}",
            status=Sketch.Status.PUBLISHED,
            author=author,
        ).tags.add(other)
        self.client = Client()

    def test_tag_filter_and_tags_endpoint(self):
        tags = self.client.get("/api/tags/")
        self.assertEqual(tags.status_code, 200)
        slugs = {item["slug"] for item in tags.json()["results"]}
        self.assertIn("neon", slugs)

        filtered = self.client.get("/api/sketches/", {"tag": "neon"})
        self.assertEqual(filtered.status_code, 200)
        titles = [item["title"] for item in filtered.json()["results"]]
        self.assertEqual(titles, ["Neon Drift"])
