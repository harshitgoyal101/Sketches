from django.conf import settings
from django.contrib import messages
from django.contrib.auth import get_user_model, login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.views import (
    LoginView,
    LogoutView,
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from .forms import (
    ResendVerificationForm,
    SignUpForm,
    StyledAuthenticationForm,
    StyledPasswordResetForm,
    StyledSetPasswordForm,
)
from .models import Sketch
from .services.email_verification import send_verification_email

User = get_user_model()


class UserLoginView(LoginView):
    template_name = "registration/login.html"
    authentication_form = StyledAuthenticationForm
    redirect_authenticated_user = True

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.request.POST.get("remember"):
            self.request.session.set_expiry(60 * 60 * 24 * 30)
        else:
            self.request.session.set_expiry(0)
        return response


class UserLogoutView(LogoutView):
    pass


class UserPasswordResetView(PasswordResetView):
    template_name = "registration/password_reset_form.html"
    email_template_name = "registration/email/password_reset_email.txt"
    html_email_template_name = "registration/email/password_reset_email.html"
    subject_template_name = "registration/email/password_reset_subject.txt"
    form_class = StyledPasswordResetForm
    success_url = reverse_lazy("password_reset_done")
    extra_email_context = {"site_name": settings.SITE_NAME}


class UserPasswordResetDoneView(PasswordResetDoneView):
    template_name = "registration/password_reset_done.html"


class UserPasswordResetConfirmView(PasswordResetConfirmView):
    template_name = "registration/password_reset_confirm.html"
    form_class = StyledSetPasswordForm
    success_url = reverse_lazy("password_reset_complete")


class UserPasswordResetCompleteView(PasswordResetCompleteView):
    template_name = "registration/password_reset_complete.html"


def signup(request):
    if request.user.is_authenticated:
        return redirect("account")

    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            try:
                send_verification_email(request, user)
            except Exception:
                user.delete()
                messages.error(
                    request,
                    "We could not send the verification email. "
                    "Check your SMTP settings and try again.",
                )
                return render(request, "registration/signup.html", {"form": form})
            messages.success(
                request,
                "Account created. Check your email to verify your address.",
            )
            return redirect("verification_sent")
    else:
        form = SignUpForm()

    return render(request, "registration/signup.html", {"form": form})


def verification_sent(request):
    return render(request, "registration/verification_sent.html")


def verify_email(request, uidb64, token):
    user = None
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save(update_fields=["is_active"])
        login(request, user)
        messages.success(request, "Your email is verified. Welcome!")
        return redirect("account")

    return render(request, "registration/verify_email_invalid.html", status=400)


def resend_verification(request):
    if request.user.is_authenticated and request.user.is_active:
        return redirect("account")

    if request.method == "POST":
        form = ResendVerificationForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"]
            user = User.objects.filter(email__iexact=email, is_active=False).first()
            if user:
                try:
                    send_verification_email(request, user)
                except Exception:
                    messages.error(
                        request,
                        "We could not send the email. Try again later.",
                    )
                    return render(
                        request,
                        "registration/resend_verification.html",
                        {"form": form},
                    )
            messages.success(
                request,
                "If an unverified account exists for that email, we sent a new link.",
            )
            return redirect("verification_sent")
    else:
        form = ResendVerificationForm()

    return render(request, "registration/resend_verification.html", {"form": form})


@login_required
def account(request):
    sketches = (
        Sketch.objects.filter(author=request.user)
        .prefetch_related("tags")
        .order_by("-updated_at")
    )
    return render(
        request,
        "sketches/account.html",
        {
            "sketches": sketches,
            "published_count": sketches.filter(status=Sketch.Status.PUBLISHED).count(),
            "draft_count": sketches.filter(status=Sketch.Status.DRAFT).count(),
        },
    )
