import json

from django.contrib.auth import get_user_model
from django.test import Client, SimpleTestCase, TestCase, override_settings

from sketches.forms import SketchEditForm
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
