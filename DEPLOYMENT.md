# Deploying to PythonAnywhere

This guide covers one-time server setup and the GitHub Actions CI/CD pipeline that deploys on every push to `main`.

**Pipeline overview**

1. **Test** — Django checks + unit tests on every push and pull request
2. **Deploy** — on push to `main` only: SSH into PythonAnywhere, pull code, migrate, collectstatic, reload web app

---

## Prerequisites

- A [PythonAnywhere](https://www.pythonanywhere.com/) account (**Hacker** plan or higher — SSH access required for automated deploys)
- Your project pushed to GitHub
- A PythonAnywhere API token ([Account → API token](https://www.pythonanywhere.com/account/#api_token))

---

## One-time PythonAnywhere setup

### 1. Clone the repository

Open a **Bash console** on PythonAnywhere:

```bash
cd ~
git clone https://github.com/YOUR_GITHUB_USER/Sketches.git
cd Sketches
```

### 2. Create a virtualenv

```bash
mkvirtualenv --python=python3.12 sketches
workon sketches
pip install -r requirements.txt
```

### 3. Environment file

Create `~/Sketches/.env` (this file stays on the server, never commit it):

```env
SECRET_KEY=your-long-random-secret-key
DEBUG=false
ALLOWED_HOSTS=YOUR_USERNAME.pythonanywhere.com
CSRF_TRUSTED_ORIGINS=https://YOUR_USERNAME.pythonanywhere.com
SITE_URL=https://YOUR_USERNAME.pythonanywhere.com
SITE_NAME=sketches101

# Optional SMTP
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=you@example.com
```

Generate a secret key locally:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 4. Initial database and static files

```bash
workon sketches
cd ~/Sketches
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser   # optional
```

### 5. Configure the web app

In the PythonAnywhere **Web** tab:

1. **Add a new web app** → Manual configuration → Python 3.12
2. **Virtualenv**: `/home/YOUR_USERNAME/.virtualenvs/sketches`
3. **WSGI file** — replace contents with [deploy/pythonanywhere/wsgi.py.example](deploy/pythonanywhere/wsgi.py.example), updating `YOUR_USERNAME`
4. **Static files** mapping:

  | URL        | Directory                                   |
  | ---------- | ------------------------------------------- |
  | `/static/` | `/home/YOUR_USERNAME/Sketches/staticfiles/` |
  | `/media/`  | `/home/YOUR_USERNAME/Sketches/media/`       |

5. Save and reload the web app

### 6. Enable SSH access

In **Account → SSH keys**, add a public key. You will use the matching **private** key as a GitHub secret (see below).

Generate a deploy key pair locally if needed:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/pa_deploy -N ""
cat ~/.ssh/pa_deploy.pub   # paste into PythonAnywhere
```

Test SSH:

```bash
ssh -i ~/.ssh/pa_deploy YOUR_USERNAME@ssh.pythonanywhere.com
```

---

## GitHub Actions secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**


| Secret               | Required | Description                                                          |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `PA_USERNAME`        | Yes      | PythonAnywhere username                                              |
| `PA_SSH_PRIVATE_KEY` | Yes      | Full private key (PEM) for SSH deploy                                |
| `PA_API_TOKEN`       | Yes      | API token from PythonAnywhere account page                           |
| `PA_DOMAIN`          | No       | Web app domain (defaults to `USERNAME.pythonanywhere.com`)           |
| `PA_PROJECT_DIR`     | No       | Project path (defaults to `/home/USERNAME/Sketches`)                 |
| `PA_VENV_DIR`        | No       | Virtualenv path (defaults to `/home/USERNAME/.virtualenvs/sketches`) |


---

## What the pipeline does

Workflow file: [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)

**On every push / PR to `main`**

- Installs dependencies
- Runs `python manage.py check --deploy`
- Runs `python manage.py test sketches`

**On push to `main` (after tests pass)**

1. SSH to `ssh.pythonanywhere.com`
2. Runs [scripts/deploy_pythonanywhere.sh](../scripts/deploy_pythonanywhere.sh):
  - `git pull` (hard reset to `origin/main`)
  - `pip install -r requirements.txt`
  - `migrate --noinput`
  - `collectstatic --noinput --clear`
3. Calls the PythonAnywhere API to **reload** the web app

You can also trigger a deploy manually from the GitHub **Actions** tab → **CI/CD** → **Run workflow**.

---

## Manual deploy

If you need to deploy without GitHub Actions:

```bash
ssh YOUR_USERNAME@ssh.pythonanywhere.com
bash ~/Sketches/scripts/deploy_pythonanywhere.sh
```

Then reload the web app from the PythonAnywhere **Web** tab, or:

```bash
curl -X POST \
  -H "Authorization: Token YOUR_API_TOKEN" \
  "https://www.pythonanywhere.com/api/v0/user/YOUR_USERNAME/webapps/YOUR_USERNAME.pythonanywhere.com/reload/"
```

---

## Troubleshooting

### `502` or import errors after deploy

- Check the **Web** tab → **Error log**
- Confirm virtualenv path and WSGI `project_home` match `/home/USERNAME/Sketches`
- Run `workon sketches && python manage.py check` in a PA console

### Static files missing

- Confirm `/static/` maps to `staticfiles/` (not `sketches/static/`)
- Re-run `python manage.py collectstatic --noinput` on the server

### CSRF errors on login/forms

- Set `CSRF_TRUSTED_ORIGINS=https://YOUR_USERNAME.pythonanywhere.com` in `.env`
- Reload the web app

### SSH deploy fails from GitHub Actions

- Verify `PA_SSH_PRIVATE_KEY` includes the full key with `-----BEGIN` / `-----END` lines
- Confirm the public key is registered on PythonAnywhere
- Paid plan required for SSH

### Tests pass locally but fail in CI

- CI uses Python 3.12 and `DEBUG=false` for deploy checks — ensure production env vars are valid

---

## Custom domains

If you use a custom domain on PythonAnywhere:

1. Add the domain to `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS` in `.env`
2. Set GitHub secret `PA_DOMAIN` to the exact domain shown in the Web tab (e.g. `www.example.com`)

