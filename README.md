<div align="center">

<img src="./client/public/vite.svg" width="72" height="72" alt="ShipStack" />

# ShipStack

### The repository health, security pre-audit, and CI/CD diagnostic engine.

**Every workflow commit carries risk. This is where you secure it.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

[**Live App →**](https://shipstack.kushagarwal.tech) &nbsp;&nbsp;·&nbsp;&nbsp; [**GitHub →**](https://github.com/Kush172005/Github-Actions-Simulator)

</div>

---

## The problem

Setting up CI/CD workflows and securing package dependency trees is a slow, error-prone cycle. Developers write a GitHub Actions workflow, push a commit to their remote branch, wait 3 minutes for a runner to boot, only for it to fail on an unpinned environment variable, a mismatched node engine, or an unpinned runner OS. 

Furthermore, when runs fail, developers are confronted with thousands of lines of raw, cluttered terminal stdout. Finding the root cause — let alone figuring out the exact security configuration patch to fix it — requires hunting through stack traces, Docker logs, and registry APIs.

Vulnerabilities, loose supply-chain permissions, and misconfigured workflows shouldn't wait for remote pipelines or IC meetings to surface. They need to be **analyzed, identified, and resolved locally before a PR is even opened**.

---

## What ShipStack does

ShipStack is a local diagnostic workspace for GitHub repositories. It pulls live repository trees, extracts package dependency manifests (`package.json`, `requirements.txt`), inspects CI workflow setups (`.github/workflows`), and queries registry APIs to profile dependencies. 

If your build has failed, paste the raw build terminal output into the diagnostic panel — the AI analyzer identifies the root cause and generates immediate, copyable fix configurations (YAML, bash scripts, or code blocks) using a fallback-resilient LLM orchestration pipeline.

| Capability | Description |
|---|---|
| **Ecosystem Profiling** | Detects repository configurations (e.g. Next.js, React/Vite, Node.js, Python/FastAPI, Go, Rust, Docker) to deliver targeted, framework-specific recommendations. |
| **CI/CD Security Audit** | Scans GitHub Actions workflow parameters. Flags floating action references (unpinned tags), loose permissions, and unoptimized runners. |
| **Dependency Health Scan** | Scans dependency lockfiles and manifests, checks for unpinned versions, mixed managers, and estimates supply chain vulnerability risks. |
| **Pulsing Waiting Screen** | Integrates a relaxing, cinematic scanning screen featuring a pulsing quantum core, circular radar grids, and percentage indicators to occupy the user during remote inference steps. |
| **Diagnostics Overlay** | Displays estimated repository health scores (0-100), estimated risk ratings (LOW/MEDIUM/HIGH), and quick metric counts for severe alerts. |
| **Actionable Fix Accordion** | Suggestions are grouped into collapsible cards with priority sliders. Every fix contains an exact, copyable code block or shell command. |
| **Log Explanation Engine** | Paste a raw terminal error log block to receive an SRE root-cause analysis, explanation, and the exact script needed to resolve the crash. |
| **Session Cache & Pagination** | Caches repository metadata inside `sessionStorage` to prevent GitHub API rate limits. Grid views are paginated to 6 items per page for clean navigation. |

---

## Try the demo

The frontend is configured to run locally out-of-the-box. You can clone the repository, install npm dependencies, and start the development server immediately:

```bash
git clone https://github.com/Kush172005/Github-Actions-Simulator
cd Github-Actions-Simulator/client
npm install
npm run dev
# → http://localhost:5173
```

To connect to the local FastAPI backend and execute live AI audits against your own repositories, follow the [Local setup](#local-setup) steps below.

---

## Architecture

ShipStack is composed of four decoupled, easily maintainable layers:

1.  **Client (React + Vite)**: A single-page application. Features a dark-mode glassmorphic theme styled with Tailwind CSS, high-fidelity micro-interactions by Framer Motion, and client-side routing.
2.  **API Gateway (FastAPI)**: An async Python backend. Routes requests, validates schemas, reads GitHub repository file structures, and coordinates dependency checks against npm and PyPI registries.
3.  **AI Orchestration**: Runs LLM analysis prompts (SRE insights, workflow audit, and log diagnostics) using a prioritized, multi-provider provider chain with automated retries.
4.  **Database (MongoDB)**: Used to persist user credentials, OAuth access tokens, and activity panel history.

---

## How the AI is wired

To prevent service interruptions due to API limits or provider downtime, ShipStack implements a **hybrid fallback chain** spanning two different API providers. If the primary model fails or returns invalid formatting, the client automatically falls back to secondary models.

| Stage | Tier 1 (Primary) | Tier 2 (Fallback) | Tier 3 (Safety Net) |
|---|---|---|---|
| **Primary LLM provider** | OpenRouter (Free) | OpenRouter (Backup) | HuggingFace (Serverless) |
| **Model 1** | `poolside/laguna-s-2.1:free` | `nvidia/nemotron-3-super-120b-a12b:free` | `Qwen/Qwen2.5-7B-Instruct` |
| **Model 2** | `nvidia/nemotron-3-ultra-550b-a55b:free` | — | `mistralai/Mistral-7B-Instruct-v0.2` |
| **Model 3** | — | — | `microsoft/Phi-3.5-mini-instruct` |

**Why this design matters**: Free-tier API providers limit output parameters and are subject to rate constraints (e.g. OpenRouter caps free tiers at 20 requests per minute). ShipStack intercepts rate-limit status codes (HTTP 429), respects `Retry-After` headers, and switches providers automatically so that the developer never encounters a blank screen or a crash.

---

## Project layout

```
Github-Actions-Simulator/
│
├── client/                             # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── analyze/                # Results widgets, insight cards, and fix lists
│   │   │   │   ├── ScanningScreen.jsx  # Pulsing quantum waiting screen
│   │   │   │   └── FixList.jsx         # Accordion fixes with priority bars
│   │   │   ├── dashboard/              # Workspace layouts and repo cards
│   │   │   │   └── RepoPreviewModal.jsx# Repository profile overlays
│   │   │   └── landing/                # Marketing/landing hero components
│   │   │
│   │   ├── pages/                      # Page layouts (AnalyzePage, DashboardPage)
│   │   ├── lib/                        # API clients and projectDetect stack checks
│   │   └── index.css                   # Custom radar and scanline keyframe styles
│   │
│   ├── package.json                    # Dev dependencies and startup scripts
│   └── tailwind.config.js              # Theme and color settings
│
└── server/                             # FastAPI backend application
    ├── app/
    │   ├── ai/                         # AI Client fallback loops and prompts
    │   │   ├── client.py               # Provider orchestration (OpenRouter + HF)
    │   │   ├── prompts.py              # System SRE review prompts
    │   │   └── sanitize.py             # JSON parser and control character scrubbers
    │   │
    │   ├── analyzers/                  # Local scanners (dependencies, workflows)
    │   ├── engines/                    # Payload builders and insight aggregators
    │   ├── routers/                    # Endpoint routers (analyze, auth, github)
    │   └── config.py                   # Pydantic Settings configuration variables
    │
    ├── main.py                         # Backend runner entrypoint
    └── requirements.txt                # Python environment requirements
```

---

## Local setup

To run the full stack with live AI scans and GitHub integrations locally:

### 1. Configure the Frontend
1.  Navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Create a `.env` file containing your GitHub OAuth configurations:
    ```env
    VITE_GITHUB_CLIENT_ID=your-github-client-id
    VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback/github
    ```

### 2. Configure the Backend
1.  Navigate to the server directory:
    ```bash
    cd ../server
    ```
2.  Create a Python virtual environment and activate it:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Create a `.env` configuration file:
    ```env
    MONGODB_URI=mongodb://localhost:27017
    DATABASE_NAME=shipstack
    JWT_SECRET=your-32-byte-hex-jwt-key
    
    GITHUB_CLIENT_ID=your-github-client-id
    GITHUB_CLIENT_SECRET=your-github-client-secret
    GITHUB_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback/github
    
    CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
    
    # AI Keys (At least one is required)
    OPENROUTER_API_KEY=your-openrouter-key
    HUGGINGFACE_API_KEY=your-huggingface-token
    ```

### 3. Start the Processes
1.  Ensure a local instance of MongoDB is running on port `27017`.
2.  Start the FastAPI server:
    ```bash
    # In server directory
    uvicorn main:app --reload --port 8000
    ```
3.  Start the Vite dev server:
    ```bash
    # In client directory
    npm run dev
    ```
4.  Open `http://localhost:5173` in your browser.

---

## Design decisions and honest reflections

Building this codebase required balancing API rate constraints against the depth of code audits. Here is a summary of the trade-offs and design decisions encountered:

**What I tried that didn't work:**

*   **Sending full source files to the AI**: The first version sent entire files (like large workflow YAMLs and complete dependency manifests) to the LLM. In repositories with multiple workflows, this quickly hit OpenRouter's token output budget, resulting in truncated, invalid JSON responses (`finish_reason='length'`). I resolved this by capping the total input payload size to 50K characters, trimming individual file samples to a maximum of 2,000 characters, and reducing the requested output volume to 5 insights and 6 fixes.
*   **Strict JSON decoding**: Free frontier models like Poolside sometimes generate JSON containing raw control characters (such as literal newlines `\n` or vertical-tabs `\x0b` inside string values). Standard python `json.loads` throws errors in strict mode. I implemented a pre-parsing sanitization function (`_sanitize_for_json`) to strip control codes and switched to `strict=False` when calling `json.loads`.
*   **Constant API background sync**: At first, the dashboard fetched fresh repository profiles from GitHub on every mount. This caused visible loading delays and rapidly consumed the user's GitHub API rate limit. I moved to a `sessionStorage` caching mechanism. The repositories load instantly, and the user can click "Refresh" to explicitly bust the cache when needed.

**What I'd build with more time:**

1.  **Background Worker Task Queue**: Auditing large configurations can take 15–30 seconds. Running this directly inside the FastAPI request thread holds open worker processes. Migrating task runs to a Redis worker queue (e.g. Celery or RQ) would allow the API gateway to scale independently.
2.  **Vector database (RAG) CVE matching**: Instead of relying solely on the LLM's static weights for outdated package security warnings, querying a vector store indexed with active GitHub Advisory databases would guarantee precise CVE disclosures.
3.  **Local dockerized worker execution**: Allowing developers to simulate the workflow actions inside a local Docker container (using libraries like `act`) to inspect steps before committing.
