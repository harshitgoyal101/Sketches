import re

from django import forms
from django.contrib.auth.forms import (
    AuthenticationForm,
    PasswordResetForm,
    SetPasswordForm,
    UserCreationForm,
)
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.forms import inlineformset_factory
from django.forms.models import construct_instance

from .models import Sketch, SketchAsset, Tag
from .services.file_tree import normalize_path
from .services.sketch_starters import get_default_filename, get_starter_code, normalize_sketch_type


def _clean_sketch_path(value, *, field_label="Path"):
    path = normalize_path(value or "")
    if not path:
        raise forms.ValidationError(f"{field_label} is required.")
    if path.startswith("..") or "/../" in f"/{path}/":
        raise forms.ValidationError("Path cannot contain .. segments.")
    if any(part.startswith(".") for part in path.split("/")):
        raise forms.ValidationError("Hidden files are not allowed.")
    return path


def style_field(field):
    """Apply site theme classes to a form field widget."""
    widget = field.widget
    widget_type = widget.__class__.__name__

    if widget_type in ("CheckboxInput",):
        widget.attrs.setdefault("class", "form-check-input")
    elif widget_type in ("CheckboxSelectMultiple",):
        widget.attrs.setdefault("class", "form-check-input")
    elif widget_type in ("Select", "SelectMultiple"):
        widget.attrs.setdefault("class", "form-select")
    elif widget_type == "Textarea":
        widget.attrs.setdefault("class", "form-textarea")
    elif widget_type == "ClearableFileInput":
        widget.attrs.setdefault("class", "form-file")
    else:
        widget.attrs.setdefault("class", "form-input")


def style_form(form):
    for field in form.fields.values():
        style_field(field)


class ThemedForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)


class ThemedModelForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)


class SignUpForm(UserCreationForm):
    email = forms.EmailField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password1", "password2")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)
        self.fields["username"].widget.attrs.setdefault("autocomplete", "username")
        self.fields["username"].widget.attrs.setdefault("placeholder", "alex")
        self.fields["username"].help_text = (
            "Shown on your sketches and author profile. For example: <strong>alex</strong>. "
            "Up to 150 characters — letters, numbers, and @ . + - _ only."
        )
        self.fields["email"].widget.attrs.setdefault("autocomplete", "email")
        self.fields["password1"].widget.attrs.update(
            {
                "autocomplete": "new-password",
                "data-password-primary": "true",
                "placeholder": "Sketch@42",
            }
        )
        self.fields["password2"].widget.attrs.update(
            {
                "autocomplete": "new-password",
                "data-password-confirm": "true",
                "placeholder": "Sketch@42",
            }
        )
        self.fields["password1"].help_text = ""
        self.fields["password2"].help_text = ""

    def clean_password1(self):
        password = self.cleaned_data.get("password1")
        if not password:
            return password

        errors = []
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long.")
        if not re.search(r"[A-Za-z]", password):
            errors.append("Password must include at least one letter.")
        if not re.search(r"\d", password):
            errors.append("Password must include at least one number.")
        if not re.search(r"[^A-Za-z0-9]", password):
            errors.append("Password must include at least one symbol.")
        username = (self.cleaned_data.get("username") or "").strip()
        if username:
            lowered_password = password.lower()
            lowered_username = username.lower()
            if lowered_password == lowered_username or (
                len(lowered_username) >= 3 and lowered_username in lowered_password
            ):
                errors.append("Password should not be your username.")
        if errors:
            raise ValidationError(errors)
        return password

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data["email"]
        user.is_active = False
        if commit:
            user.save()
        return user


class StyledAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)

    def confirm_login_allowed(self, user):
        if not user.is_active:
            raise forms.ValidationError(
                "Verify your email before logging in. "
                "Check your inbox or resend the verification email.",
                code="inactive",
            )
        super().confirm_login_allowed(user)


class ResendVerificationForm(ThemedForm):
    email = forms.EmailField(
        widget=forms.EmailInput(
            attrs={
                "placeholder": "you@example.com",
                "autocomplete": "email",
            }
        )
    )


class StyledPasswordResetForm(PasswordResetForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"].widget.attrs.update(
            {
                "class": "form-input",
                "autocomplete": "email",
                "placeholder": "you@example.com",
            }
        )


class StyledSetPasswordForm(SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)


class SketchEditForm(ThemedModelForm):
    """Editable sketch fields. Admin-only fields are added when is_admin=True."""

    class Meta:
        model = Sketch
        fields = (
            "title",
            "description",
            "entry_filename",
            "code",
            "thumbnail",
            "tags",
            "sketch_type",
            "status",
            "is_home_background",
        )
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-input sketch-title-input"}),
            "entry_filename": forms.TextInput(
                attrs={"class": "form-input code-ide-filename-input"}
            ),
            "description": forms.Textarea(
                attrs={
                    "rows": 12,
                    "class": "form-textarea sketch-description-input",
                    "placeholder": "Write a markdown description…",
                }
            ),
            "code": forms.Textarea(
                attrs={
                    "rows": 20,
                    "class": "form-textarea form-textarea-code sketch-code-input code-editor",
                    "spellcheck": "false",
                    "data-editor-lang": "javascript",
                    "style": "border-radius:0;border:none;box-shadow:none;",
                }
            ),
            "tags": forms.CheckboxSelectMultiple(),
        }
        help_texts = {
            "description": "Markdown supported.",
            "entry_filename": "Main source file path (e.g. sketch.js or src/sketch.js).",
            "sketch_type": (
                "p5.js sketches use JavaScript. Processing sketches use .pde syntax "
                "and run in the browser via Processing.js."
            ),
        }

    def __init__(self, *args, is_admin=False, editor_mode=False, lock_sketch_type=False, **kwargs):
        self.lock_sketch_type = lock_sketch_type
        super().__init__(*args, **kwargs)
        if editor_mode:
            allowed = {"title", "entry_filename", "code"}
            if not lock_sketch_type:
                allowed.add("sketch_type")
            for name in list(self.fields):
                if name not in allowed:
                    self.fields.pop(name, None)
        if not is_admin:
            for name in ("status", "is_home_background"):
                self.fields.pop(name, None)
        elif "is_home_background" in self.fields:
                self.fields["is_home_background"].help_text = (
                    "Only one p5.js sketch can be the home page background."
                )
        if "tags" in self.fields:
            self.fields["tags"].queryset = Tag.objects.order_by("name")
            self.fields["tags"].required = False
        if "entry_filename" in self.fields:
            self.fields["entry_filename"].required = False
        if not lock_sketch_type and not self.instance.pk and not self.is_bound:
            sketch_type = normalize_sketch_type(self.initial.get("sketch_type"))
            self.initial.setdefault("sketch_type", sketch_type)
            self.initial.setdefault("entry_filename", get_default_filename(sketch_type))
            self.initial.setdefault("code", get_starter_code(sketch_type))
        self._apply_sketch_type_widgets()

    def save(self, commit=True):
        sketch = super().save(commit=False)
        sketch_type = self.cleaned_data.get("sketch_type")
        if sketch_type:
            sketch.sketch_type = sketch_type
        if commit:
            sketch.save()
            self.save_m2m()
        return sketch

    def editor_sketch_type(self):
        if "sketch_type" in self.fields:
            if self.is_bound:
                return normalize_sketch_type(self.data.get("sketch_type"))
            return normalize_sketch_type(self.initial.get("sketch_type"))
        if self.instance.pk:
            return normalize_sketch_type(self.instance.sketch_type)
        return Sketch.SketchType.P5JS

    def clean(self):
        cleaned_data = super().clean()
        if "sketch_type" in self.fields:
            sketch_type = normalize_sketch_type(cleaned_data.get("sketch_type"))
        elif self.instance.pk:
            sketch_type = normalize_sketch_type(self.instance.sketch_type)
        else:
            sketch_type = Sketch.SketchType.P5JS
        cleaned_data["sketch_type"] = sketch_type
        entry_filename = (cleaned_data.get("entry_filename") or "").strip()
        if not entry_filename:
            cleaned_data["entry_filename"] = get_default_filename(sketch_type)
        else:
            cleaned_data["entry_filename"] = _clean_sketch_path(
                entry_filename,
                field_label="Main file path",
            )
        return cleaned_data

    def _post_clean(self):
        """Only bind model fields that remain on the form (editor mode drops several)."""
        opts = self._meta
        exclude = self._get_validation_exclusions()
        construct_fields = [name for name in opts.fields if name in self.fields]

        try:
            self.instance = construct_instance(
                self, self.instance, construct_fields, opts.exclude
            )
        except ValidationError as error:
            self._update_errors(error)

        if "sketch_type" in self.cleaned_data and "sketch_type" not in self.fields:
            self.instance.sketch_type = self.cleaned_data["sketch_type"]

        try:
            self.instance.full_clean(exclude=exclude, validate_unique=False)
        except ValidationError as error:
            self._update_errors(error)

        self.validate_unique()

    def _apply_sketch_type_widgets(self):
        sketch_type = self.data.get("sketch_type") if self.is_bound else None
        if not sketch_type:
            sketch_type = self.initial.get("sketch_type")
        if not sketch_type and self.instance.pk:
            sketch_type = self.instance.sketch_type
        sketch_type = normalize_sketch_type(sketch_type)

        is_processing = sketch_type == Sketch.SketchType.PROCESSING
        starter = get_default_filename(sketch_type)
        self.fields["code"].widget.attrs["data-editor-lang"] = "java" if is_processing else "javascript"
        self.fields["entry_filename"].widget.attrs["placeholder"] = starter
        if not self.instance.pk:
            self.fields["title"].widget.attrs.setdefault("placeholder", "Untitled sketch")


class SketchAssetForm(ThemedModelForm):
    class Meta:
        model = SketchAsset
        fields = ("order", "filename", "asset_type", "content")
        widgets = {
            "content": forms.Textarea(
                attrs={
                    "rows": 8,
                    "class": "form-textarea form-textarea-code code-editor",
                    "spellcheck": "false",
                    "data-editor-lang": "javascript",
                }
            ),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["order"].widget.attrs.setdefault("min", "0")
        self.fields["filename"].help_text = "Path relative to the sketch folder (e.g. lib/helper.js)."
        parent_sketch = getattr(self.instance, "sketch", None)
        if parent_sketch and parent_sketch.sketch_type == Sketch.SketchType.PROCESSING:
            self.fields["content"].widget.attrs["data-editor-lang"] = "java"

    def clean_filename(self):
        return _clean_sketch_path(self.cleaned_data.get("filename"), field_label="Filename")


class SketchDetailsForm(ThemedModelForm):
    """Sketch metadata (description, thumbnail, tags, etc.) — no code editor."""

    class Meta:
        model = Sketch
        fields = (
            "title",
            "description",
            "thumbnail",
            "tags",
            "status",
        )
        widgets = {
            "title": forms.TextInput(attrs={"class": "form-input sketch-title-input"}),
            "description": forms.Textarea(
                attrs={
                    "rows": 12,
                    "class": "form-textarea sketch-description-input",
                    "placeholder": "Write a markdown description…",
                }
            ),
            "tags": forms.CheckboxSelectMultiple(),
        }
        help_texts = {
            "description": "Markdown supported.",
        }

    def __init__(self, *args, is_admin=False, **kwargs):
        super().__init__(*args, **kwargs)
        if not is_admin:
            self.fields.pop("status", None)
        if "tags" in self.fields:
            self.fields["tags"].queryset = Tag.objects.order_by("name")
            self.fields["tags"].required = False


SketchAssetFormSet = inlineformset_factory(
    Sketch,
    SketchAsset,
    form=SketchAssetForm,
    extra=0,
    can_delete=True,
)
