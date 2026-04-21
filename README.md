# Classroom Course App

A self-hosted online course platform that uses Google Classroom for authentication, Google Sheets as a database, and Google Drive for content storage. No backend server required.

**Built for teachers who want:**
- Structured learning paths with forced ordering
- Assessments (multiple choice, true/false, word banks) with automated grading
- PDFs and slides with embedded checkpoint assessments
- Group or individual grading
- Student progress analytics

---

## Table of Contents

- [Teacher Setup](#teacher-setup)
  - [1. Fork and Clone](#1-fork-and-clone)
  - [2. Create a Google Cloud Project](#2-create-a-google-cloud-project)
  - [3. Configure the OAuth Consent Screen](#3-configure-the-oauth-consent-screen)
  - [4. Create OAuth Credentials](#4-create-oauth-credentials)
  - [5. Create a Service Account](#5-create-a-service-account)
  - [6. Deploy the Cloud Function](#6-deploy-the-cloud-function)
  - [7. Configure the App](#7-configure-the-app)
  - [8. Deploy to GitHub Pages](#8-deploy-to-github-pages)
  - [9. Create Your First Course](#9-create-your-first-course)
- [Student Guide](#student-guide)
- [Keeping Up to Date](#keeping-up-to-date)
- [Architecture Overview](#architecture-overview)

---

## Teacher Setup

**Estimated time:** 30–45 minutes on first setup. Subsequent courses take about 20 minutes.

**What you'll need:**
- A Google account (personal or Workspace for Education)
- A GitHub account
- [Node.js](https://nodejs.org) (v18 or higher) installed on your computer
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed on your computer

---

### 1. Fork and Clone

**1a.** Click **Fork** in the top-right corner of this repository on GitHub.

> 📸 _[Screenshot: GitHub fork button]_

**1b.** On the fork page, give your repository a name. **Note this name** — you'll need it in the next step. Click **Create fork**.

> 📸 _[Screenshot: GitHub fork page with repo name field highlighted]_

**1c.** Clone your fork and install dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
npm install
```

---

### 2. Create a Google Cloud Project

**2a.** Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account you'll use as a teacher.

**2b.** Click the project selector at the top, then **New Project**. Give it a name (e.g. "My Classroom App") and click **Create**.

> 📸 _[Screenshot: Google Cloud Console — New Project dialog]_

**2c.** With your new project selected, go to **APIs & Services → Library** and enable these four APIs one by one (search for each):

- Google Classroom API
- Google Sheets API
- Google Drive API
- Cloud Functions API

> 📸 _[Screenshot: APIs & Services Library with search bar]_

---

### 3. Configure the OAuth Consent Screen

This is the screen your students will see when they sign in for the first time.

**3a.** Go to **APIs & Services → OAuth consent screen**.

**3b.** Select **External** and click **Create**.

> 📸 _[Screenshot: OAuth consent screen — user type selection]_

**3c.** Fill in the required fields:
- **App name:** something recognisable to your students (e.g. "Ms Smith's Course App")
- **User support email:** your email
- **Developer contact email:** your email

Click **Save and Continue**.

**3d.** On the **Scopes** step, click **Save and Continue** without adding anything. The app requests scopes at sign-in time.

**3e.** On the **Test users** step — this is important. Click **Add Users** and add:
- Your own Google account email
- Every student's Google account email

> 📸 _[Screenshot: OAuth consent screen — Test users step with Add Users button]_

> **Why test users?** Google marks apps from private developers as "unverified" until they go through a formal review. Adding your students as test users lets them sign in with a simple consent screen instead of a scary warning. You can add up to 100 users — enough for any class.

Click **Save and Continue**, then **Back to Dashboard**.

**3f.** Leave the app in **Testing** mode (do not publish).

---

### 4. Create OAuth Credentials

**4a.** Go to **APIs & Services → Credentials** and click **Create Credentials → OAuth client ID**.

**4b.** Set **Application type** to **Web application**.

**4c.** Under **Authorized JavaScript origins**, click **Add URI** and enter:
```
http://localhost:5173
```
Also add your GitHub Pages URL:
```
https://YOUR_USERNAME.github.io
```

**4d.** Under **Authorized redirect URIs**, click **Add URI** and enter:
```
http://localhost:5173/
```
Also add:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

> 📸 _[Screenshot: OAuth client ID creation form with origins and redirect URIs filled in]_

**4e.** Click **Create**. A dialog shows your **Client ID** — copy it and keep it somewhere safe. You do not need the client secret.

> 📸 _[Screenshot: OAuth client ID dialog with Client ID highlighted]_

---

### 5. Create a Service Account

The service account lets the Cloud Function read answer keys and grant students access to course files without using anyone's personal credentials.

**5a.** Go to **IAM & Admin → Service Accounts** and click **Create Service Account**.

**5b.** Give it a name (e.g. "classroom-app-function") and click **Create and Continue**. Skip the optional steps and click **Done**.

> 📸 _[Screenshot: Create Service Account form]_

**5c.** Click on your new service account in the list, go to the **Keys** tab, click **Add Key → Create new key**, select **JSON**, and click **Create**. A `.json` file will download — keep this file safe and do not commit it to your repository.

> 📸 _[Screenshot: Service account Keys tab with Add Key button]_

---

### 6. Deploy the Cloud Function

The Cloud Function handles secure grading and content unlocking. It runs serverlessly on Google Cloud's free tier (2 million invocations/month — more than enough for any class).

**6a.** Open a terminal, authenticate with Google Cloud, and set your project:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

> Your project ID is visible in the Google Cloud Console header (it looks like `my-classroom-app-123456`).

**6b.** Copy the env vars template:

```bash
cp cloud-function/.env.yaml.example cloud-function/.env.yaml
```

Open `cloud-function/.env.yaml` in a text editor and replace the three placeholder values:
- `YOUR_CLIENT_ID` — the OAuth Client ID from Step 4
- `YOUR_USERNAME` — your GitHub username
- `PASTE_KEY_JSON_HERE` — the full contents of the service account `.json` key file (paste as-is, no escaping needed)

**6c.** From the `cloud-function/` directory, deploy the function:

```bash
cd cloud-function
gcloud functions deploy classroomApp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --env-vars-file .env.yaml
```

**6d.** After deployment completes, the terminal shows a **URL** for your function. Copy it — it looks like:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/classroomApp
```

> 📸 _[Screenshot: Terminal showing successful deployment and function URL]_

---

### 7. Configure the App

**7a.** In the root of your cloned repository, copy the example environment file:

```bash
cp .env.example .env
```

**7b.** Open `.env` in a text editor and fill in the three values:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_CLOUD_FUNCTION_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/classroomApp
BASE_PATH=/YOUR_REPO_NAME/
```

> **Important:** `BASE_PATH` must start and end with a `/` and match your repository name exactly.

---

### 8. Deploy to GitHub Pages

**8a.** Build and deploy:

```bash
npm run deploy
```

This builds the app and pushes it to a `gh-pages` branch in your repository.

**8b.** On GitHub, go to your repository → **Settings → Pages**. Under **Source**, select **Deploy from a branch**, choose the `gh-pages` branch, and click **Save**.

> 📸 _[Screenshot: GitHub Pages settings with gh-pages branch selected]_

**8c.** Wait about 60 seconds, then visit:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

You should see the sign-in page. Sign in with your teacher Google account to confirm everything works.

> 📸 _[Screenshot: App sign-in page in browser]_

---

### 9. Create Your First Course

**9a.** After signing in, click **New Course** on the teacher dashboard.

**9b.** The app will show your active Google Classroom courses. Select the one you want to link.

**9c.** The app will automatically:
- Create a Google Sheet in your Drive with all the required tabs
- Create a Drive folder for your course content
- Sync your student roster from Classroom

This takes about 10–15 seconds.

**9d.** You're now ready to build your course:
- **Resources** — upload PDFs, text files, or slides and set checkpoint assessments
- **Assessments** — create standalone assessments and configure retake rules
- **Learning Path** — arrange everything into an ordered sequence with pass thresholds
- **Groups** — optionally create student groups with group or individual grading

Share your app URL with students when your course is ready.

---

## Student Guide

**What you need:** Your school Google account and the URL your teacher gave you.

**1.** Go to the URL your teacher shared.

**2.** Click **Sign in with Google** and sign in with your school account.

**3.** If you see a screen that says **"Google hasn't verified this app"** — this is expected. Your teacher's app is self-hosted, not a commercial product. To continue:
   - Click **Advanced**
   - Click **Proceed to [app name] (unsafe)**

> 📸 _[Screenshot: Google unverified app screen with Advanced and Proceed links highlighted]_

**4.** On the next screen, review the permissions and click **Continue**.

**5.** You'll land on your course dashboard showing your learning path. Items unlock automatically as you complete each one.

---

## Keeping Up to Date

If this repository gets bug fixes or new features after you've forked it, you can pull them in:

**On GitHub:** Go to your fork → click **Sync fork** → **Update branch**.

> 📸 _[Screenshot: GitHub Sync fork button on a forked repository]_

After syncing, redeploy:
```bash
npm install
npm run deploy
```

---

## Architecture Overview

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React (GitHub Pages) | All UI, routing, client-side logic |
| Auth | Google OAuth 2.0 PKCE | Sign-in, session management |
| Course data | Google Sheets (teacher's Drive) | Progress, groups, learning path config |
| Content files | Google Drive (teacher's Drive) | PDFs, slides, audio |
| Grading + gating | Google Cloud Function | Secure answer checking, Drive access grants |
| Gradebook | Google Classroom API | Grade passback |

**No shared servers, no shared databases.** Each teacher's deployment is completely independent — your course data lives entirely in your own Google account.
