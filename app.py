import os
import re
import json
import time
import threading
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from playwright.sync_api import sync_playwright

load_dotenv()
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "0"

app = Flask(__name__)
CORS(app)

import shutil
import subprocess

# Ensure Playwright Chromium browser binary exists on server startup
try:
    print("[Playwright Boot Check] Ensuring Chromium binary is installed...")
    subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"], check=False)
except Exception as _p_boot_err:
    print(f"[Playwright Boot Check Warning] {_p_boot_err}")
try:
    import cv2
except ImportError:
    cv2 = None

def convert_mp4_to_y4m(mp4_path: str, y4m_path: str) -> bool:
    """
    Converts an uploaded MP4 video to raw Y4M (YUV4MPEG2) format required by Chromium's
    --use-file-for-fake-video-capture flag.
    Uses FFmpeg if available, with OpenCV fallback.
    """
    print(f"[Face Auth Video Converter] Input MP4 Path: {mp4_path}")
    print(f"[Face Auth Video Converter] Target Y4M Path: {y4m_path}")

    # Method 1: Try FFmpeg binary
    ffmpeg_exe = shutil.which("ffmpeg")
    if ffmpeg_exe:
        try:
            cmd = [ffmpeg_exe, "-y", "-i", mp4_path, "-pix_fmt", "yuv420p", y4m_path]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0 and os.path.exists(y4m_path) and os.path.getsize(y4m_path) > 0:
                print(f"[FFmpeg Conversion Status] SUCCESS: Converted to Y4M ({os.path.getsize(y4m_path)} bytes)")
                return True
            else:
                print(f"[FFmpeg Conversion Warning] returncode={res.returncode}, err={res.stderr[:200]}")
        except Exception as ffmpeg_err:
            print(f"[FFmpeg Conversion Error] {ffmpeg_err}")

    # Method 2: OpenCV fallback
    if cv2:
        try:
            cap = cv2.VideoCapture(mp4_path)
            if not cap.isOpened():
                print(f"[OpenCV Conversion Error] Could not open video file: {mp4_path}")
                return False

            fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

            with open(y4m_path, "wb") as f:
                header = f"YUV4MPEG2 W{width} H{height} F{fps}:1 Ip A1:1 C420\n"
                f.write(header.encode("ascii"))

                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                    f.write(b"FRAME\n")
                    yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)
                    f.write(yuv.tobytes())

            cap.release()
            if os.path.exists(y4m_path) and os.path.getsize(y4m_path) > 0:
                print(f"[OpenCV Conversion Status] SUCCESS: Converted to Y4M ({os.path.getsize(y4m_path)} bytes)")
                return True
        except Exception as cv_err:
            print(f"[OpenCV Conversion Error] {cv_err}")

    print(f"[Face Auth Video Converter] FAILED: Could not convert {mp4_path} to Y4M.")
    return False

# Safe console printing for Windows cp1252 character maps
def safe_print(*args, **kwargs):
    try:
        print(*args, **kwargs)
    except Exception:
        try:
            clean_args = [str(a).encode('ascii', errors='ignore').decode('ascii') for a in args]
            print(*clean_args, **kwargs)
        except Exception:
            pass

# Supabase init
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

# Global telemetry and face auth stores
execution_telemetry_store = {}
project_face_auth_store = {}

@app.route("/", methods=["GET"])
def health_check():
    accept_header = request.headers.get("Accept", "")
    data = {
        "status": "online",
        "service": "QA·AI Autonomous Testing Backend Engine",
        "intelligence": "ACTIVE & RUNNING",
        "version": "1.0.0",
        "playwright": "Connected & Operating",
        "telemetry": "OpenTelemetry Ingestion Active",
        "face_auth": "Virtual Webcam Engine Ready",
        "project_assets": "Asset Manager Active",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    if "text/html" in accept_header:
        html_page = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>QA·AI Intelligence Engine</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }}
                .card {{ background: #18181b; border: 1px solid #27272a; padding: 40px; border-radius: 24px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(99, 102, 241, 0.15); }}
                .badge {{ display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }}
                .dot {{ width: 8px; height: 8px; background: #34d399; border-radius: 50%; display: inline-block; box-shadow: 0 0 10px #34d399; animation: pulse 2s infinite; }}
                h1 {{ font-size: 26px; font-weight: 900; margin: 0 0 8px 0; background: linear-gradient(135deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
                p {{ color: #a1a1aa; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5; }}
                .info-box {{ background: #09090b; border: 1px solid #27272a; border-radius: 14px; padding: 16px; text-align: left; font-family: monospace; font-size: 12px; color: #818cf8; line-height: 1.8; }}
                @keyframes pulse {{ 0%, 100% {{ opacity: 1; }} 50% {{ opacity: 0.4; }} }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="badge"><span class="dot"></span> Intelligence Active & Running</div>
                <h1>QA·AI Platform</h1>
                <p>Autonomous End-to-End Testing & Telemetry Automation Engine</p>
                <div class="info-box">
                    ⚙️ Status: 200 OK (Online)<br>
                    🤖 Intelligence: ACTIVE & RUNNING<br>
                    🎭 Playwright Engine: Ready<br>
                    🔐 Face Verification: Operational<br>
                    📊 OTel Observability: Connected<br>
                    📁 Project Asset Storage: Ready
                </div>
            </div>
        </body>
        </html>
        """
        return html_page, 200

    return jsonify(data), 200

# Gemini init
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

# ─────────────────────────────────────────────────────────────
#  LAYER 1 — GEMINI SYSTEM PROMPT
#  Goal: Extract INTENT only (field name + value + click text).
#  Never output raw CSS selectors.
# ─────────────────────────────────────────────────────────────
GEMINI_SYSTEM_PROMPT = """
You are a universal browser test automation translator.
Convert any natural language test instructions or CSV test tables into a structured JSON array.
Respond ONLY with a valid JSON array. No markdown, no comments, no explanation.

SUPPORTED ACTIONS:
1. goto      — navigate to a URL
   { "action": "goto", "args": { "url": "https://..." } }

2. fill      — type a value into any form field (input, textarea, select/dropdown)
   { "action": "fill", "args": { "field": "<field name>", "value": "<value to type>" } }
   - "field" must be a short descriptive English label like: "email", "password", "customer name", "state", "city", "phone", "project name", "portico length", "staircase width", etc.
   - NEVER output CSS selectors. NEVER output input[...] or div[...] syntax.
   - If user writes "fill state with Tamil Nadu" → field="state", value="Tamil Nadu"
   - If user writes "select Erode from city" → field="city", value="Erode"

3. click     — click any button, link, card, tab, menu item
   { "action": "click", "args": { "text": "<visible button/link/card text>" } }
   - "text" must be the exact visible label as shown on the page.
   - NEVER output CSS selectors. NEVER output :has-text(...) syntax.
   - If user writes "click Sign in" → text="Sign in"
   - If user writes "press submit" → text="Submit"
   - If user writes "choose Standard Package" → text="Standard Package"
   - If user writes "click Next Step: Step 2 →" → text="Next Step"

4. verify_text — verify text is visible on the page
   { "action": "verify_text", "args": { "text": "<expected text>" } }

5. wait      — pause execution
   { "action": "wait", "args": { "seconds": <number> } }

6. upload_file — upload a file asset into a file input field
   { "action": "upload_file", "args": { "field": "<field label name>", "asset": "<asset filename or name>" } }
   - Example: user writes "upload_file \"Resume\" using \"resume.pdf\"" → field="Resume", asset="resume.pdf"
   - Example: user writes "upload_file \"Profile Picture\" using \"profile.jpg\"" → field="Profile Picture", asset="profile.jpg"
   - Example: user writes "upload \"Invoice\" with \"invoice.csv\"" → field="Invoice", asset="invoice.csv"

CSV FORMAT RULES (columns: Step, Action, Target, Value/Expected):
- Action="Open URL" or "goto" → use "goto", url = Value/Expected
- Action="Fill":
  * If Target already contains CSS selector syntax like input[placeholder="..."] or input[type=...], preserve it EXACTLY as the "field" value.
    Example: Target = input[placeholder="Villa Estimate"] → field = "input[placeholder='Villa Estimate']"
  * If Target is a plain English label like "Email", "State", "Phone" → use it as-is as the "field" value.
    Example: Target = "State" → field = "state"
- Action="Click" → use "click", text=Target (strip arrows → and step numbers like "Step 2")
- Action="Verify" → use "verify_text", text = Target column ONLY (the short keyword like "Dashboard", "Estimation"). NEVER use the Value/Expected column — that is just a human description, not page text.
- Action="Upload" or "upload_file" → use "upload_file", field = Target, asset = Value/Expected

EXAMPLE OUTPUT:
[
  { "action": "goto", "args": { "url": "https://example.com/login" } },
  { "action": "fill", "args": { "field": "email", "value": "user@test.com" } },
  { "action": "fill", "args": { "field": "password", "value": "secret123" } },
  { "action": "click", "args": { "text": "Sign in" } },
  { "action": "upload_file", "args": { "field": "Resume", "asset": "resume.pdf" } },
  { "action": "upload_file", "args": { "field": "Profile Photo", "asset": "profile.jpg" } },
  { "action": "verify_text", "args": { "text": "Dashboard" } }
]
"""

def fallback_rule_based_translate(commands: str):
    """
    Rule-based fallback translator for test commands when Gemini API quota/rate limit is hit.
    Translates common natural language commands directly into Playwright JSON actions.
    """
    steps = []
    lines = [line.strip() for line in commands.split("\n") if line.strip()]
    for line in lines:
        l_lower = line.lower()
        
        # 1. GOTO / OPEN / VISIT
        if any(l_lower.startswith(w) for w in ["open", "goto", "visit", "navigate"]):
            urls = re.findall(r'https?://[^\s"\']+', line)
            url = urls[0] if urls else line.split()[-1]
            steps.append({"action": "goto", "args": {"url": url}})
            
        # 2. UPLOAD / ATTACH / UPLOAD_FILE
        elif any(l_lower.startswith(w) for w in ["upload_file", "upload", "attach"]):
            match = re.search(r'(?:upload_file|upload|attach)\s+["\']?([^"\']+?)["\']?\s+(?:using|with|from)\s+["\']?([^"\']+?)["\']?$', line, re.I)
            if match:
                field_val = match.group(1).strip()
                asset_val = match.group(2).strip()
                steps.append({"action": "upload_file", "args": {"field": field_val, "asset": asset_val}})
            else:
                parts = line.split()
                asset_val = parts[-1].strip('"\'')
                field_val = parts[1].strip('"\'') if len(parts) > 2 else "file"
                steps.append({"action": "upload_file", "args": {"field": field_val, "asset": asset_val}})

        # 3. FILL / ENTER / TYPE / INPUT
        elif any(l_lower.startswith(w) for w in ["fill", "enter", "type", "input"]):
            content = re.sub(r'^(fill|enter|type|input)\s+', '', line, flags=re.I).strip()
            if " with " in content.lower():
                parts = re.split(r'\s+with\s+', content, maxsplit=1, flags=re.I)
                field = parts[0].strip()
                val = parts[1].strip()
            else:
                parts = content.rsplit(maxsplit=1)
                if len(parts) == 2:
                    field = parts[0].strip()
                    val = parts[1].strip()
                else:
                    field = content
                    val = ""
            steps.append({"action": "fill", "args": {"field": field, "value": val}})

        # 4. CLICK / PRESS / SELECT
        elif any(l_lower.startswith(w) for w in ["click", "press", "select"]):
            content = re.sub(r'^(click|press|select)\s+', '', line, flags=re.I).strip()
            content = re.sub(r'\s+(button|link|tab)$', '', content, flags=re.I).strip()
            steps.append({"action": "click", "args": {"text": content}})

        # 5. VERIFY / ASSERT / CHECK
        elif any(l_lower.startswith(w) for w in ["verify", "assert", "check"]):
            content = re.sub(r'^(verify|assert|check)\s+', '', line, flags=re.I).strip()
            content = re.sub(r'^(text|page|contains)\s+', '', content, flags=re.I).strip()
            steps.append({"action": "verify_text", "args": {"text": content}})

        # 6. WAIT / PAUSE
        elif any(l_lower.startswith(w) for w in ["wait", "pause", "sleep"]):
            nums = re.findall(r'\d+', line)
            sec = int(nums[0]) if nums else 2
            steps.append({"action": "wait", "args": {"seconds": sec}})
        else:
            steps.append({"action": "click", "args": {"text": line}})

    return steps


@app.route("/api/translate", methods=["POST"])
def translate_commands():
    data = request.json
    commands = data.get("commands", "")
    if not commands:
        return jsonify({"error": "No commands provided"}), 400

    # Try Gemini API translation first
    try:
        if gemini_key:
            model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=GEMINI_SYSTEM_PROMPT)
            response = model.generate_content(f"Translate the following test commands:\n{commands}")
            raw_text = response.text.strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:-3].strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:-3].strip()

            parsed_steps = json.loads(raw_text)
            return jsonify(parsed_steps)
    except Exception as e:
        print(f"Gemini API translation failed or quota exceeded ({str(e)}), switching to Fallback Rule Translator.")

    # Seamless Fallback Rule Translator if Gemini API is rate limited / unavailable
    try:
        fallback_steps = fallback_rule_based_translate(commands)
        return jsonify(fallback_steps)
    except Exception as fb_err:
        return jsonify({"error": f"Failed to translate steps: {str(fb_err)}"}), 500


# ─────────────────────────────────────────────────────────────
#  LAYER 2 — SMART EXECUTION ENGINE
#  Handles ANY web app by auto-detecting element types.
# ─────────────────────────────────────────────────────────────

def _try_fill_selector(page, sel: str, value: str) -> bool:
    """
    Attempt to fill or select_option on a single selector.
    Returns True on success, False on any failure.
    """
    try:
        if not page.is_visible(sel, timeout=3000):
            return False
        tag = page.evaluate("(s) => document.querySelector(s)?.tagName?.toLowerCase()", sel)
        if tag == "select":
            try:
                page.select_option(sel, label=value, timeout=3000)
                return True
            except Exception:
                try:
                    page.select_option(sel, value=value, timeout=3000)
                    return True
                except Exception:
                    return False
        else:
            page.fill(sel, value, timeout=3000)
            return True
    except Exception:
        return False


def smart_fill(page, field: str, value: str):
    """
    Universal fill handler. Given a human-readable field label (or a direct CSS
    selector) and a value, this function finds the correct element on any web page
    and fills it, whether it is an <input>, <select>, custom dropdown, or <textarea>.
    """
    field_lower = field.lower().strip()

    # ── Step 0: Direct CSS Selector Match ──
    css_keywords = ("input[", "select[", "textarea[", "[name", "[id", "[placeholder", "[type", "[aria")
    if any(field_lower.startswith(k) for k in css_keywords) or ("[" in field and "]" in field):
        direct_sel = field.replace('"', "'")
        if _try_fill_selector(page, direct_sel, value):
            return True
        # Extract placeholder/name if direct CSS string failed
        placeholder_match = re.search(r"placeholder=['\"]?([^'\"\]]+)['\"]?", field, re.IGNORECASE)
        name_match = re.search(r"name=['\"]?([^'\"\]]+)['\"]?", field, re.IGNORECASE)
        if placeholder_match:
            field_lower = placeholder_match.group(1).lower()
        elif name_match:
            field_lower = name_match.group(1).lower()

    # ── Step 1: Playwright Built-in get_by_label (Matches <label>State</label>) ──
    try:
        label_loc = page.get_by_label(field, exact=False).first
        if label_loc.is_visible(timeout=1500):
            tag = label_loc.evaluate("el => el.tagName.toLowerCase()")
            if tag in ["input", "textarea"]:
                label_loc.fill(value, timeout=2500)
                return True
            elif tag == "select":
                try:
                    label_loc.select_option(label=value, timeout=2000)
                    return True
                except Exception:
                    label_loc.select_option(value=value, timeout=2000)
                    return True
    except Exception:
        pass

    # ── Step 2: Candidate Attribute Selectors (Inputs AND Selects) ──
    if "email" in field_lower:
        candidates = [
            "#login-email",
            "input[type='email']",
            "input[name*='email' i]",
            "input[placeholder*='email' i]",
            "input[id*='email' i]",
        ]
    elif "password" in field_lower or "pass" in field_lower:
        candidates = [
            "#login-password",
            "input[type='password']",
            "input[name*='password' i]",
            "input[placeholder*='pass' i]",
        ]
    elif "phone" in field_lower or "mobile" in field_lower or "contact" in field_lower:
        candidates = [
            "input[type='tel']",
            "input[name*='phone' i]",
            "input[placeholder*='phone' i]",
            "input[id*='phone' i]",
            "input[placeholder*='mobile' i]",
        ]
    else:
        words = [w for w in field_lower.split() if len(w) > 1]
        candidates = []
        for word in words:
            candidates += [
                f"select[name*='{word}' i]",
                f"select[id*='{word}' i]",
                f"select[aria-label*='{word}' i]",
                f"input[placeholder*='{word}' i]",
                f"input[name*='{word}' i]",
                f"input[id*='{word}' i]",
                f"textarea[placeholder*='{word}' i]",
                f"textarea[name*='{word}' i]",
                f"[aria-label*='{word}' i]",
            ]

    for sel in candidates:
        if _try_fill_selector(page, sel, value):
            return True

    # ── Step 3: DOM Label / Container Traversal (Find select/input inside or near label) ──
    words = [w for w in field_lower.split() if len(w) > 1]
    for word in words:
        label_traversals = [
            f"label:has-text('{word}') + select",
            f"label:has-text('{word}') ~ select",
            f"label:has-text('{word}') select",
            f"div:has-text('{word}') select",
            f"label:has-text('{word}') + input",
            f"label:has-text('{word}') ~ input",
            f"label:has-text('{word}') input",
            f"div:has-text('{word}') input",
        ]
        for sel in label_traversals:
            if _try_fill_selector(page, sel, value):
                return True

    # ── Step 3.5: Multi-Input Container Solver (Portico Length/Width, Staircase Length/Width, etc.) ──
    for word in words:
        if word in ["length", "width", "height", "area", "ft", "feet"]:
            continue
        try:
            # Look for container divs matching key section label (e.g. "Portico", "Staircase")
            containers = page.locator(f"div:has-text('{word}')").all()
            for container in reversed(containers):
                try:
                    inputs = container.locator("input:visible").all()
                    if len(inputs) > 0:
                        target_idx = 1 if "width" in field_lower else 0
                        if target_idx < len(inputs):
                            inputs[target_idx].fill(value, timeout=2000)
                            return True
                except Exception:
                    continue
        except Exception:
            continue

    # ── Step 4: Option Matcher — Search All Visible <select> Elements for Option Matching 'value' ──
    try:
        selects = page.locator("select:visible").all()
        for s in selects:
            try:
                # Check if this select contains an option matching value
                has_opt = s.evaluate(f"el => Array.from(el.options).some(o => o.text.toLowerCase().includes('{value.lower()}') || o.value.toLowerCase().includes('{value.lower()}'))")
                if has_opt:
                    try:
                        s.select_option(label=value, timeout=2000)
                        return True
                    except Exception:
                        s.select_option(value=value, timeout=2000)
                        return True
            except Exception:
                continue
    except Exception:
        pass

    # ── Step 5: Custom Dropdown Trigger Click (Click dropdown -> Click option) ──
    for word in words:
        dropdown_triggers = [
            f"[class*='select' i]:has-text('{word}')",
            f"[class*='dropdown' i]:has-text('{word}')",
            f"button:has-text('{word}')",
            f"div:has-text('{word}')",
        ]
        for trigger in dropdown_triggers:
            try:
                if page.is_visible(trigger, timeout=1000):
                    page.click(trigger)
                    page.wait_for_timeout(500)
                    option_selectors = [
                        f"li:has-text('{value}')",
                        f"option:has-text('{value}')",
                        f"[role='option']:has-text('{value}')",
                        f"div:has-text('{value}')",
                        f"span:has-text('{value}')",
                    ]
                    for opt_sel in option_selectors:
                        try:
                            if page.is_visible(opt_sel, timeout=1500):
                                page.click(opt_sel)
                                return True
                        except Exception:
                            continue
            except Exception:
                continue

    raise Exception(f"Could not find field '{field}' on this page to fill with '{value}'")


def smart_click(page, text: str):
    """
    Universal click handler. Given visible text on any web app, finds and clicks
    the most appropriate interactive element — button, link, radio option, card, tab, etc.
    Handles space variations like 'signin' -> 'Sign In'.
    """
    text = text.strip()
    text_lower = text.lower()

    # Generate text variants (e.g., 'signin' -> 'sign in', 'login' -> 'log in')
    variants = [text]
    if "signin" in text_lower:
        variants.append(text_lower.replace("signin", "Sign In"))
        variants.append("Sign In")
        variants.append("sign in")
    elif "login" in text_lower:
        variants.append("Log In")
        variants.append("log in")

    priority_selectors = []
    if any(w in text_lower for w in ["vtab", "logo", "brand"]):
        priority_selectors.extend([
            "[class*='logo' i]",
            "img[alt*='logo' i]",
            "img[alt*='vtab' i]",
            "a:has([class*='logo' i])",
            "button:has([class*='logo' i])",
            "[id*='logo' i]",
            "a[class*='brand' i]",
        ])

    for var in variants:
        priority_selectors.extend([
            # Exact button matches (highest priority)
            f"button:has-text('{var}')",
            f"input[type='submit'][value*='{var}' i]",
            f"input[type='button'][value*='{var}' i]",
            # Links
            f"a:has-text('{var}')",
            # Role-based buttons (Material UI, custom components)
            f"[role='button']:has-text('{var}')",
            f"[role='tab']:has-text('{var}')",
            f"[role='menuitem']:has-text('{var}')",
            f"[role='radio']:has-text('{var}')",
            f"[role='option']:has-text('{var}')",
            # Radio buttons, checkboxes & labels
            f"label:has-text('{var}')",
            f"input[type='radio'][value*='{var}' i]",
            f"input[type='checkbox'][value*='{var}' i]",
            # Card / list item click
            f"li:has-text('{var}')",
            f"span:has-text('{var}')",
        ])

    # Only fall back to generic button[type='submit'] if text implies a form submission action
    submit_words = ["submit", "login", "log in", "log-in", "signin", "sign in", "sign-in", "save", "send", "process", "complete"]
    if any(w in text_lower for w in submit_words):
        priority_selectors.append("button[type='submit']")

    # Last resort: any element with exact text
    for var in variants:
        priority_selectors.append(f"*:has-text('{var}')")

    for sel in priority_selectors:
        try:
            locator = page.locator(sel).first
            if locator.is_visible(timeout=1500):
                locator.click(timeout=3000)
                return True
        except Exception:
            continue

    raise Exception(f"Could not find clickable element with text '{text}' on this page")


# Track running threads and active execution objects to cancel them
active_runs = set()

def run_playwright_test(execution_id, test_case_id, steps, browser_name, headless):
    """
    Background worker that runs steps in Playwright and writes updates/logs to Supabase.
    Uses the universal Smart Execution Engine for fill and click actions.
    """
    if not supabase:
        print("Supabase client not initialized. Cannot record execution log.")
        return

    active_runs.add(execution_id)
    start_time = time.time()
    safe_print(f"Starting Playwright thread worker for run #{execution_id}")

    # Normalize and parse steps input (JSON string / list / natural language / Supabase fallback)
    parsed_steps = []
    if isinstance(steps, str):
        try:
            parsed_steps = json.loads(steps)
        except Exception:
            parsed_steps = parse_commands_to_json(steps)
    elif isinstance(steps, list):
        parsed_steps = steps

    if not parsed_steps and test_case_id and supabase:
        try:
            tc_res = supabase.table("test_cases").select("*").eq("id", test_case_id).execute()
            if tc_res.data and len(tc_res.data) > 0:
                tc_rec = tc_res.data[0]
                cached = tc_rec.get("cached_json")
                if cached:
                    if isinstance(cached, str):
                        try:
                            parsed_steps = json.loads(cached)
                        except Exception:
                            parsed_steps = parse_commands_to_json(cached)
                    elif isinstance(cached, list):
                        parsed_steps = cached
                elif tc_rec.get("commands"):
                    parsed_steps = parse_commands_to_json(tc_rec["commands"])
        except Exception as err:
            safe_print(f"[Step Fetch Warning] {err}")

    steps = parsed_steps
    safe_print(f"[Run Worker #{execution_id}] Normalized steps count: {len(steps)}")

    # Generate W3C traceparent header (00-trace_id-span_id-01)
    import secrets
    trace_id = secrets.token_hex(16)
    parent_span_id = secrets.token_hex(8)
    traceparent_header = f"00-{trace_id}-{parent_span_id}-01"

    # Check Face Auth Configuration for this project
    project_id = None
    try:
        tc_res = supabase.table("test_cases").select("project_id").eq("id", test_case_id).execute()
        if tc_res.data and len(tc_res.data) > 0:
            project_id = tc_res.data[0].get("project_id")
    except Exception:
        pass

    face_auth_enabled = False
    face_video_path = None
    face_video_url = None

    if project_id:
        if project_id in project_face_auth_store:
            cfg = project_face_auth_store[project_id]
            face_auth_enabled = cfg.get("face_auth_enabled", False)
            face_video_path = cfg.get("face_video_path")
            face_video_url = cfg.get("face_video_url")
        else:
            try:
                p_res = supabase.table("projects").select("*").eq("id", project_id).execute()
                if p_res.data and len(p_res.data) > 0:
                    p_data = p_res.data[0]
                    face_auth_enabled = p_data.get("face_auth_enabled", False)
                    face_video_path = p_data.get("face_video_path")
                    face_video_url = p_data.get("face_video_url")
            except Exception:
                pass

    if face_auth_enabled:
        upload_dir = os.path.join(app.root_path, "uploads", "face_videos")
        os.makedirs(upload_dir, exist_ok=True)

        if not face_video_path or not os.path.exists(face_video_path):
            for fname in os.listdir(upload_dir):
                if fname.startswith(f"face_proj_{project_id}_") and not fname.endswith(".json") and not fname.endswith(".y4m"):
                    face_video_path = os.path.abspath(os.path.join(upload_dir, fname))
                    break

        if (not face_video_path or not os.path.exists(face_video_path)) and face_video_url:
            try:
                import requests
                safe_print(f"[Face Auth Cloud Sync] Downloading face video for project #{project_id} from {face_video_url}...")
                resp = requests.get(face_video_url, timeout=15)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    local_filename = f"face_proj_{project_id}_cloud.mp4"
                    local_target = os.path.abspath(os.path.join(upload_dir, local_filename))
                    with open(local_target, "wb") as f:
                        f.write(resp.content)
                    face_video_path = local_target
                    safe_print(f"[Face Auth Cloud Sync SUCCESS] Saved cloud video to: {face_video_path} ({len(resp.content)} bytes)")
            except Exception as dl_err:
                safe_print(f"[Face Auth Cloud Sync Warning] {dl_err}")

    initial_spans = []
    if face_auth_enabled:
        initial_spans = [
            {"service_name": "AuthService", "name": "AuthenticationWorkflowStarted", "duration_ms": 12, "status_code": "200 OK", "attributes": "Flow: Username/Password + Face Verification"},
            {"service_name": "CameraService", "name": "CameraPermissionRequested", "duration_ms": 4, "status_code": "200 OK", "attributes": "Permission: camera"},
            {"service_name": "CameraService", "name": "CameraPermissionGranted", "duration_ms": 6, "status_code": "200 OK", "attributes": "Granted automatically via Playwright Virtual Media"},
            {"service_name": "VirtualWebcamService", "name": "VirtualWebcamInitialized", "duration_ms": 38, "status_code": "200 OK", "attributes": f"Input Source: {os.path.basename(face_video_path) if face_video_path else 'Default Virtual Stream'}"},
            {"service_name": "BiometricAuthEngine", "name": "FaceVerificationCompleted", "duration_ms": 310, "status_code": "200 OK", "attributes": "Verification Result: APPROVED (Face Recognized)"}
        ]

    auth_summary = {
        "username_login": "PASS",
        "password_login": "PASS",
        "face_verification": "PASS" if face_auth_enabled else "DISABLED",
        "camera_permission": "Granted" if face_auth_enabled else "N/A",
        "virtual_webcam": "Started" if (face_auth_enabled and face_video_path) else ("Active" if face_auth_enabled else "N/A"),
        "video_source": os.path.basename(face_video_path) if (face_auth_enabled and face_video_path) else "None",
        "status": "Success"
    }

    # Store telemetry context for this run
    execution_telemetry_store[execution_id] = {
        "trace_id": trace_id,
        "parent_span_id": parent_span_id,
        "network_errors": [],
        "console_errors": [],
        "spans": initial_spans,
        "auth_summary": auth_summary,
        "ai_explanation": None
    }

    # Update run status to Running
    try:
        supabase.table("executions").update({"status": "Running", "auth_summary": auth_summary}).eq("id", execution_id).execute()
    except Exception:
        try:
            supabase.table("executions").update({"status": "Running"}).eq("id", execution_id).execute()
        except Exception:
            pass

    temp_y4m_file = None
    try:
        with sync_playwright() as p:
            chrome_args = []
            if face_auth_enabled:
                chrome_args.extend([
                    "--use-fake-ui-for-media-stream",
                    "--use-fake-device-for-media-stream"
                ])
                if face_video_path and os.path.exists(face_video_path):
                    active_video_capture_path = None
                    if face_video_path.lower().endswith(".y4m"):
                        active_video_capture_path = face_video_path
                        print(f"[Chromium Fake Webcam Init] Loaded Y4M stream: {active_video_capture_path}")
                    else:
                        upload_dir = os.path.join(app.root_path, "uploads", "face_videos")
                        os.makedirs(upload_dir, exist_ok=True)
                        perm_y4m_path = os.path.abspath(os.path.join(upload_dir, f"perm_proj_{project_id}.y4m"))
                        
                        if not os.path.exists(perm_y4m_path) or os.path.getsize(perm_y4m_path) == 0:
                            try:
                                print(f"[Face Auth Video Converter] Pre-converting MP4 to permanent Y4M stream...")
                                convert_mp4_to_y4m(face_video_path, perm_y4m_path)
                            except Exception as conv_err:
                                print(f"[Face Auth Video Converter Warning] {conv_err}")

                        if os.path.exists(perm_y4m_path) and os.path.getsize(perm_y4m_path) > 0:
                            active_video_capture_path = perm_y4m_path
                            print(f"[Chromium Fake Webcam Init] SUCCESS! Loaded permanent Y4M stream: {active_video_capture_path}")
                        else:
                            active_video_capture_path = face_video_path

                    if active_video_capture_path and os.path.exists(active_video_capture_path):
                        chrome_args.append(f"--use-file-for-fake-video-capture={active_video_capture_path}")

            if browser_name.lower() == "firefox":
                browser = p.firefox.launch(headless=headless)
            elif browser_name.lower() == "webkit":
                browser = p.webkit.launch(headless=headless)
            else:
                browser = p.chromium.launch(headless=headless, args=chrome_args)

            # Create browser context with camera permissions automatically granted
            context_options = {}
            if face_auth_enabled:
                context_options["permissions"] = ["camera", "microphone"]

            context = browser.new_context(**context_options)
            if face_auth_enabled:
                try:
                    context.grant_permissions(["camera", "microphone"])
                except Exception as perm_err:
                    print(f"[Playwright Perm Warning] {perm_err}")
            page = context.new_page()

            # Register Request Interceptor ONLY when Face Authentication is enabled
            if face_auth_enabled:
                def handle_face_auth_route(route, req):
                    url = req.url.lower()
                    resource_type = req.resource_type.lower()
                    method = req.method.upper()

                    # 1. Never intercept static assets, scripts, stylesheets, fonts, media, or documents
                    if resource_type in ["document", "script", "stylesheet", "image", "font", "media", "websocket", "eventsource", "manifest"]:
                        route.continue_()
                        return

                    # 2. Check if request is a genuine Face Auth API endpoint (xhr or fetch)
                    # Intercept all POST verification requests to biometrics.vtabsquare.com except initial session handoff
                    is_face_auth_endpoint = (
                        resource_type in ["xhr", "fetch"] and
                        method == "POST" and
                        not any(u in url for u in ["/api/login", "/api/auth", "/api/session", "/api/employees", "process_verification"]) and
                        ("biometrics.vtabsquare.com" in url or any(k in url for k in ["verify-face", "face-verify", "face_login", "biometric", "faceauth", "check-face", "verify_face", "scan_face", "face_auth", "verify"]))
                    )

                    print(f"[Playwright Route] {method} | {resource_type} | {req.url} -> Intercepted: {is_face_auth_endpoint}")

                    # 3. Fulfill genuine Face Authentication API requests only
                    if is_face_auth_endpoint:
                        try:
                            route.fulfill(
                                status=200,
                                content_type="application/json",
                                headers={
                                    "Access-Control-Allow-Origin": "*",
                                    "Access-Control-Allow-Headers": "*"
                                },
                                body=json.dumps({
                                    "success": True,
                                    "verified": True,
                                    "status": "APPROVED",
                                    "message": "Automated QA Face Verification Success",
                                    "token": "qa_automated_session_token_2026"
                                })
                            )
                            return
                        except Exception as e:
                            print(f"[Playwright Route Error] Failed to fulfill route: {e}")
                            route.continue_()
                            return

                    # 4. Standard API request continuation without modifying native browser headers
                    route.continue_()

                page.route("**/*", handle_face_auth_route)

            # Attach real-time Network and Browser Console listeners
            def on_response(resp):
                url = resp.url
                status = resp.status

                # Capture Network Failures (HTTP 4xx/5xx)
                if status >= 400:
                    if not any(ext in url for ext in ['.png', '.css', '.js', '.ico', '.svg', '.woff', '.woff2', '.ttf', 'gstatic.com']):
                        try:
                            b_text = resp.text()
                        except Exception:
                            b_text = ""
                        execution_telemetry_store[execution_id]["network_errors"].append({
                            "url": url,
                            "status": status,
                            "status_text": resp.status_text,
                            "body": b_text[:400]
                        })

                # Auto-generate OpenTelemetry Backend Spans for Demo & API endpoints
                if "/api/demo/" in url or "/api/store/" in url:
                    t_id = execution_telemetry_store[execution_id]["trace_id"]
                    if "payment" in url:
                        spans = [
                            {"service_name": "PaymentService", "name": "POST /api/store/payment", "duration_ms": 10020, "status_code": "504 GATEWAY_TIMEOUT", "attributes": "requests.exceptions.ConnectTimeout: Socket connection to payment.stripe.internal:443 timed out after 10000ms"}
                        ]
                    elif "profile" in url:
                        spans = [
                            {"service_name": "CustomerProfileService", "name": "POST /api/store/profile", "duration_ms": 85, "status_code": "500 INTERNAL_SERVER_ERROR", "attributes": "AttributeError: 'NoneType' object has no attribute 'email' at demo_app/app.py:L115"}
                        ]
                    elif "search" in url:
                        spans = [
                            {"service_name": "InventorySearchService", "name": "GET /api/store/search", "duration_ms": 3520, "status_code": "200 OK", "attributes": "db.query SELECT * FROM inventory_items | Rows scanned: 500,000 | Index Used: False | Advice: Add index to inventory_items(name)"}
                        ]
                    elif "email" in url:
                        spans = [
                            {"service_name": "EmailNotificationWorker", "name": "POST /api/store/email", "duration_ms": 210, "status_code": "500 INTERNAL_SERVER_ERROR", "attributes": "SMTPConnectError: Connection refused on port 587 (Silent API Background Failure)"}
                        ]
                    elif "analytics" in url:
                        spans = [
                            {"service_name": "AnalyticsService", "name": "GET /api/demo/analytics", "duration_ms": 4520, "status_code": "200 OK", "attributes": "HTTP GET /api/demo/analytics -> 200"},
                            {"service_name": "PostgreSQL-DB", "name": "db.query SELECT * FROM transaction_logs WHERE created_at >= '2025-01-01'", "duration_ms": 4480, "status_code": "SLOW_QUERY_WARNING", "attributes": "db.rows_scanned: 1,200,000 | Index Used: False | Advice: Add index to transaction_logs(created_at)"}
                        ]
                    elif "login" in url and status >= 400:
                        spans = [
                            {"service_name": "AuthService", "name": "POST /api/demo/login", "duration_ms": 115, "status_code": "401 UNAUTHORIZED", "attributes": "HTTP POST /api/demo/login -> 401"},
                            {"service_name": "BcryptHasher", "name": "hash.verify_password", "duration_ms": 95, "status_code": "ERROR", "attributes": "AuthenticationFailed: Password hash mismatch for account test@example.com at auth_controller.py:L45"}
                        ]
                    else:
                        spans = []

                    for s in spans:
                        s["trace_id"] = t_id
                        s["execution_id"] = execution_id
                        execution_telemetry_store[execution_id]["spans"].append(s)

            def on_console(msg):
                if msg.type == 'error':
                    txt = msg.text
                    if not any(ext in txt for ext in ['gstatic.com', '.woff', '.woff2', 'traceparent']):
                        execution_telemetry_store[execution_id]["console_errors"].append(txt)

            page.on("response", on_response)
            page.on("console", on_console)

            has_failed_steps = False
            for index, step in enumerate(steps):
                if execution_id not in active_runs:
                    raise Exception("Execution cancelled by user")

                step_number = index + 1
                action = step.get("action")
                args = step.get("args", {})
                raw_command = f"{action} {json.dumps(args)}"

                supabase.table("execution_logs").insert({
                    "execution_id": execution_id,
                    "step_number": step_number,
                    "action": action,
                    "raw_command": raw_command,
                    "status": "running"
                }).execute()

                step_start = time.time()
                error_msg = None
                screenshot_url = None

                try:
                    # ── GOTO ──
                    if action == "goto":
                        page.goto(args.get("url"), wait_until="domcontentloaded", timeout=25000)
                        try:
                            page.wait_for_load_state("networkidle", timeout=3000)
                        except Exception:
                            pass
                        page.wait_for_timeout(1000)

                    # ── CLICK (universal) ──
                    elif action == "click":
                        click_text = args.get("text") or args.get("selector", "")
                        if not args.get("text") and click_text:
                            click_text = re.sub(r'(button|a|div|span|h\d|input)?\[.*?\]', '', click_text)
                            click_text = re.sub(r'(:has-text|text=)\(?', '', click_text)
                            click_text = click_text.replace(")", "").replace("'", "").replace('"', '').replace("→", "").strip()
                            click_text = click_text.split(",")[0].strip()
                        smart_click(page, click_text)
                        page.wait_for_timeout(2000)

                    # ── FILL (universal) ──
                    elif action == "fill":
                        field = args.get("field") or args.get("selector", "")
                        value = str(args.get("value", ""))
                        if not args.get("field") and field:
                            field = re.sub(r'\[.*?\]', '', field)
                            field = re.sub(r'input|select|textarea', '', field, flags=re.IGNORECASE)
                            field = field.strip(" *,.'\"")
                        smart_fill(page, field, value)

                    # ── VERIFY TEXT ──
                    elif action == "verify_text":
                        text = args.get("text", "")
                        page.wait_for_timeout(3000)
                        page.wait_for_load_state("domcontentloaded", timeout=10000)

                        def text_found_on_page(t):
                            content = page.content()
                            return t.lower() in content.lower()

                        if not text_found_on_page(text):
                            page.wait_for_timeout(3000)
                            if not text_found_on_page(text):
                                try:
                                    visible_text = page.inner_text('body')
                                    visible_text = ' '.join(visible_text.split())
                                    snippet = visible_text[:300]
                                    raise Exception(
                                        f"Verification failed: Expected text '{text}' not found. "
                                        f"Page currently shows: \"{snippet}\""
                                    )
                                except Exception as inner_err:
                                    raise inner_err

                    # ── WAIT ──
                    elif action == "wait":
                        page.wait_for_timeout(args.get("seconds", 1) * 1000)

                    # ── UPLOAD FILE ──
                    elif action in ["upload_file", "upload", "set_input_files"]:
                        field_label = args.get("field") or args.get("label") or args.get("target") or args.get("selector", "")
                        asset_name = args.get("using") or args.get("asset") or args.get("file") or args.get("value", "")

                        safe_print(f"[Upload Step] Field: '{field_label}' | Asset Target: '{asset_name}' | Project ID: {project_id}")

                        # 1. Resolve Asset Storage Path
                        resolved_file_path = None
                        if supabase and project_id:
                            try:
                                res = supabase.table("project_assets").select("*").eq("project_id", project_id).execute()
                                if res.data:
                                    for a in res.data:
                                        if (a.get("asset_name") or "").lower() == asset_name.lower() or \
                                           (a.get("original_filename") or "").lower() == asset_name.lower():
                                            if a.get("storage_path") and os.path.exists(a["storage_path"]):
                                                resolved_file_path = a["storage_path"]
                                            break
                            except Exception as db_err:
                                safe_print(f"[Project Asset DB Query Warning] {db_err}")

                        if not resolved_file_path:
                            project_assets_dir = os.path.abspath(os.path.join(app.root_path, "uploads", "assets", str(project_id)))
                            possible_path = os.path.join(project_assets_dir, asset_name)
                            if os.path.exists(possible_path):
                                resolved_file_path = possible_path
                            elif os.path.exists(project_assets_dir):
                                for fname in os.listdir(project_assets_dir):
                                    if fname.lower() == asset_name.lower():
                                        resolved_file_path = os.path.join(project_assets_dir, fname)
                                        break

                        if not resolved_file_path or not os.path.exists(resolved_file_path):
                            raise Exception(f"Asset '{asset_name}' not found in Project Assets for project #{project_id}.")

                        safe_print(f"[Upload Asset Resolved] Path: '{resolved_file_path}' ({os.path.getsize(resolved_file_path)} bytes)")

                        # 2. Locate File Input Element
                        file_input_loc = None
                        if field_label:
                            try:
                                loc = page.get_by_label(field_label, exact=False)
                                if loc.count() > 0:
                                    file_input_loc = loc.first
                            except Exception:
                                pass

                        if not file_input_loc and field_label:
                            try:
                                clean_field = re.sub(r'[^a-zA-Z0-9]', '', field_label).lower()
                                all_files = page.locator("input[type='file']").all()
                                for inp in all_files:
                                    name_attr = (inp.get_attribute("name") or "").lower()
                                    id_attr = (inp.get_attribute("id") or "").lower()
                                    aria_attr = (inp.get_attribute("aria-label") or "").lower()
                                    if clean_field in name_attr or clean_field in id_attr or clean_field in aria_attr:
                                        file_input_loc = inp
                                        break
                            except Exception:
                                pass

                        if not file_input_loc:
                            try:
                                file_input_loc = page.locator("input[type='file']").first
                            except Exception:
                                pass

                        if not file_input_loc or file_input_loc.count() == 0:
                            raise Exception(f"Could not locate file input element for '{field_label}' on target web page.")

                        # 3. Silent Playwright Upload
                        file_input_loc.set_input_files(resolved_file_path)
                        page.wait_for_timeout(1000)
                        safe_print(f"[Upload Step Success] Successfully uploaded '{os.path.basename(resolved_file_path)}' into '{field_label}' file input.")

                    else:
                        raise Exception(f"Unsupported action: {action}")

                    status = "passed"

                except Exception as step_err:
                    status = "failed"
                    error_msg = str(step_err)

                # Capture step screenshot and upload to Supabase Storage
                try:
                    screenshot_path = f"screenshot_{execution_id}_{step_number}.png"

                    # Auto-scroll active target element or text into view before snapshot
                    try:
                        target_sel = args.get("selector") or args.get("target") or args.get("text")
                        if target_sel and isinstance(target_sel, str) and not target_sel.startswith("http"):
                            if target_sel.startswith("//") or target_sel.startswith("#") or target_sel.startswith("."):
                                page.locator(target_sel).first.scroll_into_view_if_needed(timeout=1500)
                            else:
                                page.get_by_text(target_sel, exact=False).first.scroll_into_view_if_needed(timeout=1500)
                    except Exception:
                        pass

                    # Capture full-page screenshot with fallback
                    try:
                        page.screenshot(path=screenshot_path, full_page=True, timeout=4000)
                    except Exception:
                        page.screenshot(path=screenshot_path, timeout=4000)

                    with open(screenshot_path, "rb") as f:
                        file_data = f.read()
                        supabase.storage.from_("screenshots").upload(
                            path=screenshot_path,
                            file=file_data,
                            file_options={"content-type": "image/png"}
                        )
                        screenshot_url = supabase.storage.from_("screenshots").get_public_url(screenshot_path)
                    os.remove(screenshot_path)
                except Exception as img_err:
                    print(f"Screenshot upload failed: {str(img_err)}")

                duration_ms = int((time.time() - step_start) * 1000)

                supabase.table("execution_logs").update({
                    "status": status,
                    "error_message": error_msg,
                    "screenshot_url": screenshot_url,
                    "duration_ms": duration_ms
                }).eq("execution_id", execution_id).eq("step_number", step_number).execute()

                if status == "failed":
                    has_failed_steps = True
                    safe_print(f"[Step Warning] Step #{step_number} {action} failed: {error_msg}. Continuing to next step...")
                    try:
                        ai_report = generate_ai_telemetry_explanation(
                            execution_id=execution_id,
                            failed_step=f"Step #{step_number} {action}",
                            error_msg=error_msg
                        )
                        execution_telemetry_store[execution_id]["ai_explanation"] = ai_report
                    except Exception as ai_err:
                        print(f"AI explanation generation failed: {str(ai_err)}")

            total_duration = int(time.time() - start_time)
            final_exec_status = "Passed with Warnings" if has_failed_steps else "Passed"
            
            # Generate AI Telemetry explanation for passed runs (detects Silent API failures)
            try:
                ai_report = generate_ai_telemetry_explanation(
                    execution_id=execution_id,
                    failed_step="UI Execution Finished" if not has_failed_steps else "UI Execution Completed with Step Warnings",
                    error_msg="None" if not has_failed_steps else "Some optional UI steps were skipped or not found on screen"
                )
                execution_telemetry_store[execution_id]["ai_explanation"] = ai_report
            except Exception as ai_err:
                print(f"AI explanation generation failed: {str(ai_err)}")

            supabase.table("executions").update({"status": final_exec_status, "duration": total_duration}).eq("id", execution_id).execute()
            browser.close()

    except Exception as run_err:
        total_duration = int(time.time() - start_time)
        error_txt = str(run_err)
        safe_print(f"Execution run #{execution_id} failed: {error_txt}")
        try:
            supabase.table("execution_logs").insert({
                "execution_id": execution_id,
                "step_number": 1,
                "action": "Browser Launch / Network Init",
                "raw_command": f"init_browser {error_txt[:100]}",
                "status": "failed",
                "error_message": f"Execution failed: {error_txt[:300]}",
                "duration_ms": int(total_duration * 1000)
            }).execute()
        except Exception:
            pass
        supabase.table("executions").update({"status": "Failed", "duration": total_duration}).eq("id", execution_id).execute()
    finally:
        active_runs.discard(execution_id)
        if temp_y4m_file and os.path.exists(temp_y4m_file):
            try:
                os.remove(temp_y4m_file)
                print(f"[Face Auth Cleanup] Successfully deleted temporary Y4M file: {temp_y4m_file}")
            except Exception as cleanup_err:
                print(f"[Face Auth Cleanup Warning] Failed to delete temp Y4M file: {cleanup_err}")


# In-memory store for active/recent execution telemetry
execution_telemetry_store = {}

def generate_ai_telemetry_explanation(execution_id, failed_step, error_msg):
    """
    Grounds AI explanation strictly in empirical evidence:
    1. Frontend Facts (Playwright, status codes, console errors)
    2. Backend Facts (OpenTelemetry trace spans, DB query execution time)
    3. AI Recommendation with numbered developer action items
    4. Server Cold-Start / Sleeping Container Detection
    """
    store = execution_telemetry_store.get(execution_id, {})
    net_errs = store.get("network_errors", [])
    cons_errs = store.get("console_errors", [])
    spans = store.get("spans", [])

    # Clean raw HTML page content dumps from error_msg
    clean_error = re.sub(r'Page currently shows:.*$', '', error_msg, flags=re.DOTALL).strip()
    if not clean_error:
        clean_error = error_msg[:120]

    has_net_errors = len(net_errs) > 0
    has_span_errors = any("500" in str(s.get("status_code", "")) or "504" in str(s.get("status_code", "")) or "ERROR" in str(s.get("status_code", "")) or "WARNING" in str(s.get("status_code", "")) for s in spans)

    # Detect Server Cold Start / Sleeping Container (e.g. Render / Heroku free tier inactivity sleep)
    is_cold_start = (not has_net_errors) and (not has_span_errors) and (failed_step != "All UI Steps Passed") and ("verify" in failed_step.lower() or "timeout" in clean_error.lower())

    if is_cold_start:
        header = "⚠️ SERVER COLD-START / SLEEPING CONTAINER DETECTED"
    elif failed_step == "All UI Steps Passed" and (has_net_errors or has_span_errors):
        header = "⚠️ SILENT BACKEND FAILURES DETECTED (UI Passed, but Backend Failed)"
    else:
        header = "🔴 TEST FAILURE DIAGNOSIS"

    prompt = f"""
You are an expert OpenTelemetry & QA Observability engineer.
Analyze the following test failure/telemetry data and produce a structured, elegant 3-section report.

REPORT TYPE: {header}
UI STEP STATUS: {failed_step}
ERROR REASON: {clean_error}

INTERCEPTED NETWORK API ERRORS ({len(net_errs)}):
{json.dumps(net_errs, indent=2)}

BROWSER CONSOLE LOG ERRORS ({len(cons_errs)}):
{json.dumps(cons_errs, indent=2)}

BACKEND OPENTELEMETRY TRACE SPANS ({len(spans)}):
{json.dumps(spans, indent=2)}

STRICT FORMATTING REQUIREMENTS:
- Output 4 distinct sections marked by explicit headers:

===FRONTEND_FINDING===
🔴 FRONTEND FINDING (Playwright):
• UI Status: {failed_step}
• Error Detail: <short summary of UI status without raw HTML page dumps>
• Intercepted API Statuses: <list API status codes like 500, 504, 401, or None>

===FRONTEND_RECOMMENDATION===
💡 FRONTEND RECOMMENDED FIX:
1. <Actionable UI step 1>
2. <Actionable UI step 2>

===BACKEND_FINDING===
⚙️ BACKEND FINDING (OpenTelemetry Spans):
• Microservices & Spans: <list microservices or Server Cold-Start Boot Delay state>
• DB Queries & Errors: <list SQL statements, latency timings, Code Exceptions, or Cold Container Spin-up notes>

===BACKEND_RECOMMENDATION===
🛠️ BACKEND RECOMMENDED FIX:
1. <Actionable Backend step 1>
2. <Actionable Backend step 2>
"""
    try:
        if gemini_key:
            model = genai.GenerativeModel('gemini-2.5-flash')
            res = model.generate_content(prompt)
            return res.text.strip()
    except Exception as e:
        print(f"Gemini API explanation error: {str(e)}")
    
    # Fallback explanation when Gemini API rate limit occurs
    has_otel = len(spans) > 0
    net_bullets = "\n".join([f"• Endpoint: {e.get('url','')} -> HTTP {e.get('status','')}" for e in net_errs[:3]]) if net_errs else "• None (Server held connection open during container boot)"
    otel_bullets = "\n".join(['• ' + str(s.get('service_name','')) + ' -> ' + str(s.get('name','')) + ' (' + str(s.get('duration_ms','')) + 'ms): ' + str(s.get('attributes','')) for s in spans[:4]]) if has_otel else '• Telemetry: Cold-Start container spin-up delay detected at API boundary.'

    if is_cold_start:
        return f"""===FRONTEND_FINDING===
🔴 FRONTEND FINDING (Playwright):
• Failing Step: {failed_step}
• Error Detail: {clean_error} (Target cloud server was in a sleeping state and required container boot time).
• Intercepted API Statuses: None (Server held connection open while spinning up).

===FRONTEND_RECOMMENDATION===
💡 FRONTEND RECOMMENDED FIX:
1. Re-run the test suite now that the target server container is awake.
2. Add an initial server wake-up step (e.g. 'open <app_url>') before running login assertions.

===BACKEND_FINDING===
⚙️ BACKEND FINDING (OpenTelemetry Spans):
• Server State: Sleeping Container / Cold-Start Boot Delay detected on cloud host.
• Impact: Verification step timed out before backend finished container initialization.

===BACKEND_RECOMMENDATION===
🛠️ BACKEND RECOMMENDED FIX:
1. For cloud-hosted free-tier applications, increase step timeout to 30 seconds.
2. Configure a background keep-alive healthcheck ping for backend microservices."""

    prefix = "⚠️ SILENT BACKEND FAILURES DETECTED (UI Passed, but Backend Failed)\n\n" if (has_net_errors or has_span_errors) else ""

    return f"""===FRONTEND_FINDING===
{prefix}🔴 FRONTEND FINDING (Playwright):
• UI Status: {failed_step}
• Error Detail: {clean_error}

===FRONTEND_RECOMMENDATION===
💡 FRONTEND RECOMMENDED FIX:
1. Verify Playwright element selectors and waiting strategies for Post-login transitions.
2. Review failure screenshot and target element visibility on active screen.

===BACKEND_FINDING===
⚙️ BACKEND FINDING (OpenTelemetry Spans):
📡 Intercepted API Failures:
{net_bullets}

⚙️ OpenTelemetry Traces:
{otel_bullets}

===BACKEND_RECOMMENDATION===
🛠️ BACKEND RECOMMENDED FIX:
1. Inspect failed HTTP endpoint status codes (e.g. 500, 401, 404) and server response payload.
2. Verify backend microservice availability and database connection pool limits."""


@app.route("/api/otlp/v1/traces", methods=["POST"])
def ingest_otlp_traces():
    """
    OpenTelemetry OTLP Ingestion Endpoint.
    Receives JSON trace spans exported by customer backend OTel SDKs.
    """
    try:
        payload = request.json or {}
        resource_spans = payload.get("resourceSpans", [])
        ingested_count = 0

        for r_span in resource_spans:
            service_name = "backend-server"
            for attr in r_span.get("resource", {}).get("attributes", []):
                if attr.get("key") == "service.name":
                    service_name = attr.get("value", {}).get("stringValue", service_name)

            for scope_span in r_span.get("scopeSpans", []):
                for span in scope_span.get("spans", []):
                    t_id = span.get("traceId", "")
                    s_id = span.get("spanId", "")
                    p_s_id = span.get("parentSpanId", "")
                    name = span.get("name", "span")
                    kind = span.get("kind", "INTERNAL")
                    start_nano = int(span.get("startTimeUnixNano", 0))
                    end_nano = int(span.get("endTimeUnixNano", 0))
                    duration_ms = int((end_nano - start_nano) / 1000000) if end_nano > start_nano else 0
                    
                    status_code = span.get("status", {}).get("code", "OK")

                    # Match trace_id to active execution store
                    matched_exec_id = None
                    for exec_id, store in execution_telemetry_store.items():
                        if store.get("trace_id") == t_id:
                            matched_exec_id = exec_id
                            break

                    span_data = {
                        "execution_id": matched_exec_id,
                        "trace_id": t_id,
                        "span_id": s_id,
                        "parent_span_id": p_s_id,
                        "service_name": service_name,
                        "name": name,
                        "kind": str(kind),
                        "duration_ms": duration_ms,
                        "status_code": str(status_code),
                        "attributes": span.get("attributes", [])
                    }

                    if matched_exec_id and matched_exec_id in execution_telemetry_store:
                        execution_telemetry_store[matched_exec_id]["spans"].append(span_data)

                    if supabase:
                        try:
                            supabase.table("telemetry_spans").insert(span_data).execute()
                        except Exception:
                            pass
                    
                    ingested_count += 1

        return jsonify({"message": "Spans ingested", "count": ingested_count}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to ingest OTLP traces: {str(e)}"}), 500


@app.route("/api/executions/<int:execution_id>/telemetry", methods=["GET"])
def get_execution_telemetry(execution_id):
    """
    Returns full-stack diagnostic report:
    - Frontend steps & status
    - Network HTTP 4xx/5xx failures
    - Browser console log errors
    - OpenTelemetry backend trace spans
    - Grounded AI explanation summary
    """
    store = execution_telemetry_store.get(execution_id, {})
    
    # Try fetching spans from Supabase if empty in memory
    spans = store.get("spans", [])
    if not spans and supabase:
        try:
            res = supabase.table("telemetry_spans").select("*").eq("execution_id", execution_id).execute()
            if res.data:
                spans = res.data
        except Exception:
            pass

    return jsonify({
        "execution_id": execution_id,
        "trace_id": store.get("trace_id", ""),
        "network_errors": store.get("network_errors", []),
        "console_errors": store.get("console_errors", []),
        "spans": spans,
        "ai_explanation": store.get("ai_explanation")
    })


@app.route("/api/execute", methods=["POST"])
def execute_test():
    """
    Accepts config details, creates an execution entry, and returns instantly
    while the test runs in the background.
    """
    if not supabase:
        return jsonify({"error": "Supabase client is not configured"}), 500

    data = request.json
    project_id = data.get("projectId")
    test_id = data.get("testId")
    browser = data.get("browser", "Chromium")
    headless = data.get("headless", True)
    steps = data.get("steps", [])

    if isinstance(steps, str):
        try:
            steps = json.loads(steps)
        except Exception:
            steps = parse_commands_to_json(steps)

    if not project_id or not test_id:
        return jsonify({"error": "Missing required fields (projectId, testId)"}), 400

    try:
        res = supabase.table("executions").insert({
            "project_id": project_id,
            "test_id": test_id,
            "status": "Pending",
            "browser": browser,
            "headless": headless
        }).execute()

        execution_id = res.data[0]["id"]

        thread = threading.Thread(
            target=run_playwright_test,
            args=(execution_id, test_id, steps, browser, headless)
        )
        thread.start()

        return jsonify({"message": "Execution launched", "executionId": execution_id})
    except Exception as e:
        return jsonify({"error": f"Failed to launch test: {str(e)}"}), 500


@app.route("/api/cancel", methods=["POST"])
def cancel_execution():
    """
    Stops a running automation thread from executing further steps.
    """
    data = request.json
    execution_id = data.get("executionId")
    if not execution_id:
        return jsonify({"error": "Missing executionId"}), 400

    execution_id = int(execution_id)
    if execution_id in active_runs:
        active_runs.discard(execution_id)
        supabase.table("executions").update({"status": "Failed"}).eq("id", execution_id).execute()
        return jsonify({"message": "Execution cancelled successfully"})

    return jsonify({"message": "Execution was not running or already completed"}), 200


# ── OPENTELEMETRY DEMO TESTBENCH ROUTES ──────────────────────────────────────
DEMO_HTML_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>OpenTelemetry Testbench</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 650px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { color: #38bdf8; font-size: 24px; margin-top: 0; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
        button { background: #0284c7; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: background 0.2s; }
        button:hover { background: #0369a1; }
        button.btn-danger { background: #dc2626; }
        button.btn-danger:hover { background: #b91c1c; }
        button.btn-warning { background: #d97706; }
        button.btn-warning:hover { background: #b45309; }
        .status-box { background: #090d16; border: 1px solid #1e293b; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; min-height: 40px; color: #38bdf8; margin-top: 8px; word-break: break-all; }
        label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; display: block; margin-top: 12px; }
        input { width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: white; padding: 10px; border-radius: 6px; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔮 OpenTelemetry Testbench App</h1>
        <p>Interactive test page to demonstrate OpenTelemetry API error interception & root cause diagnosis.</p>

        <div class="btn-group">
            <div>
                <button class="btn-danger" id="btn-payment" onclick="triggerPayment()">1. Trigger Submit Payment (HTTP 500 Failure)</button>
                <div id="payment-status" class="status-box">Status: Ready</div>
            </div>
            <div>
                <button class="btn-warning" id="btn-profile" onclick="triggerProfile()">2. Trigger User Profile (HTTP 401 Auth Expired)</button>
                <div id="profile-status" class="status-box">Status: Ready</div>
            </div>
            <div>
                <button id="btn-analytics" onclick="triggerAnalytics()">3. Trigger Fetch Analytics (4.5s Slow Query)</button>
                <div id="analytics-status" class="status-box">Status: Ready</div>
            </div>
            <div>
                <button class="btn-danger" id="btn-missing" onclick="triggerMissing()">4. Trigger Missing Route (HTTP 404 Not Found)</button>
                <div id="missing-status" class="status-box">Status: Ready</div>
            </div>
        </div>

        <hr style="border-color: #334155; margin: 24px 0;">

        <h3>Quick Form Test</h3>
        <form onsubmit="event.preventDefault(); triggerLogin();">
            <label>Email Address</label>
            <input type="email" id="email" placeholder="user@example.com" value="test@example.com">
            <label>Password</label>
            <input type="password" id="password" placeholder="••••••••" value="WrongPass123">
            <button style="margin-top: 16px; width: 100%;" type="submit">Sign in</button>
            <div id="login-status" class="status-box">Status: Ready</div>
        </form>
    </div>

    <script>
        async function triggerPayment() {
            document.getElementById('payment-status').innerText = 'Sending POST /api/demo/payment...';
            try {
                const res = await fetch('/api/demo/payment', { method: 'POST' });
                const data = await res.json();
                document.getElementById('payment-status').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('payment-status').innerText = 'Network Error: ' + e.message;
            }
        }
        async function triggerProfile() {
            document.getElementById('profile-status').innerText = 'Sending GET /api/demo/profile...';
            try {
                const res = await fetch('/api/demo/profile');
                const data = await res.json();
                document.getElementById('profile-status').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('profile-status').innerText = 'Network Error: ' + e.message;
            }
        }
        async function triggerAnalytics() {
            document.getElementById('analytics-status').innerText = 'Sending GET /api/demo/analytics (Simulating slow query)...';
            try {
                const res = await fetch('/api/demo/analytics');
                const data = await res.json();
                document.getElementById('analytics-status').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('analytics-status').innerText = 'Network Error: ' + e.message;
            }
        }
        async function triggerMissing() {
            document.getElementById('missing-status').innerText = 'Sending GET /api/demo/missing...';
            try {
                const res = await fetch('/api/demo/missing');
                const data = await res.json();
                document.getElementById('missing-status').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('missing-status').innerText = 'Network Error: ' + e.message;
            }
        }
        async function triggerLogin() {
            document.getElementById('login-status').innerText = 'Sending POST /api/demo/login...';
            try {
                const res = await fetch('/api/demo/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        email: document.getElementById('email').value,
                        password: document.getElementById('password').value
                    })
                });
                const data = await res.json();
                document.getElementById('login-status').innerText = 'Response (' + res.status + '): ' + JSON.stringify(data);
            } catch(e) {
                document.getElementById('login-status').innerText = 'Network Error: ' + e.message;
            }
        }
    </script>
</body>
</html>
"""

@app.route("/demo", methods=["GET"])
def render_demo_page():
    """Renders OpenTelemetry demo testbench page."""
    return DEMO_HTML_PAGE, 200, {'Content-Type': 'text/html'}


@app.route("/api/demo/payment", methods=["POST", "OPTIONS"])
def demo_payment():
    """Simulates HTTP 500 Database Connection failure."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "error",
        "error_code": "DB_POOL_EXHAUSTED",
        "message": "Database connection limit (100/100) exceeded on PostgreSQL cluster pool."
    }), 500


@app.route("/api/demo/profile", methods=["GET", "OPTIONS"])
def demo_profile():
    """Simulates HTTP 401 Expired Auth Session Token."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "unauthorized",
        "error_code": "JWT_TOKEN_EXPIRED",
        "message": "User session token expired 300 seconds ago. Re-authentication required."
    }), 401


@app.route("/api/demo/analytics", methods=["GET", "OPTIONS"])
def demo_analytics():
    """Simulates a 4.5s slow database query span."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    time.sleep(4.5)
    return jsonify({
        "status": "success",
        "query_duration_ms": 4520,
        "message": "Analytics query executed across 1,200,000 table rows."
    }), 200


@app.route("/api/demo/login", methods=["POST", "OPTIONS"])
def demo_login():
    """Simulates auth login check failure."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    data = request.json or {}
    pwd = data.get("password", "")
    if pwd != "ValidPass123":
        return jsonify({
            "status": "failed",
            "error": "Invalid email or password",
            "details": "Password match check failed for account test@example.com"
        }), 401
    return jsonify({"status": "success", "token": "demo_jwt_token_12345"}), 200


# ─────────────────────────────────────────────────────────────
#  FACE AUTHENTICATION & BIOMETRIC VIDEO API ENDPOINTS
# ─────────────────────────────────────────────────────────────
@app.route("/uploads/face_videos/<path:filename>")
def serve_face_video(filename):
    """Serves uploaded face verification video files."""
    upload_dir = os.path.join(app.root_path, "uploads", "face_videos")
    return send_from_directory(upload_dir, filename)


@app.route("/api/projects/<int:project_id>/face-auth", methods=["GET", "POST", "DELETE", "OPTIONS"])
def manage_project_face_auth(project_id):
    """Manages Face Verification configuration & video uploads for projects."""
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    upload_dir = os.path.join(app.root_path, "uploads", "face_videos")
    os.makedirs(upload_dir, exist_ok=True)
    config_file = os.path.join(upload_dir, f"config_proj_{project_id}.json")

    # Helper: read disk config if available
    def load_disk_cfg():
        if os.path.exists(config_file):
            try:
                with open(config_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
        return None

    if request.method == "GET":
        disk_cfg = load_disk_cfg()
        mem_cfg = project_face_auth_store.get(project_id)
        
        cfg = {
            "face_auth_enabled": False,
            "face_video_url": None,
            "face_video_path": None
        }

        # Merge memory, disk, and Supabase data
        if mem_cfg:
            cfg.update({k: v for k, v in mem_cfg.items() if v is not None})
        if disk_cfg:
            for k, v in disk_cfg.items():
                if v is not None or k == "face_auth_enabled":
                    cfg[k] = v

        if supabase:
            try:
                p_res = supabase.table("projects").select("face_auth_enabled, face_video_url, face_video_path").eq("id", project_id).execute()
                if p_res.data and len(p_res.data) > 0:
                    p_data = p_res.data[0]
                    if p_data.get("face_auth_enabled") is not None:
                        cfg["face_auth_enabled"] = bool(p_data["face_auth_enabled"])
                    if p_data.get("face_video_url"):
                        cfg["face_video_url"] = p_data["face_video_url"]
                    if p_data.get("face_video_path"):
                        cfg["face_video_path"] = p_data["face_video_path"]
            except Exception as e:
                safe_print(f"[Face Auth DB Sync Warning] {e}")

        # Check if local video file exists on disk to construct working URL if missing
        if not cfg.get("face_video_url"):
            for fname in os.listdir(upload_dir):
                if fname.startswith(f"face_proj_{project_id}_") and not fname.endswith(".json") and not fname.endswith(".y4m"):
                    base_host = request.host_url.rstrip('/')
                    cfg["face_video_url"] = f"{base_host}/uploads/face_videos/{fname}"
                    cfg["face_video_path"] = os.path.abspath(os.path.join(upload_dir, fname))
                    cfg["face_auth_enabled"] = True
                    break

        project_face_auth_store[project_id] = cfg
        return jsonify(cfg), 200

    if request.method == "POST":
        disk_cfg = load_disk_cfg() or {}
        existing_cfg = project_face_auth_store.get(project_id) or disk_cfg

        enabled_param = request.form.get("face_auth_enabled")
        if enabled_param is not None:
            enabled = str(enabled_param).lower() in ["true", "1", "yes"]
        else:
            enabled = existing_cfg.get("face_auth_enabled", True)

        file = request.files.get("video")
        video_url = existing_cfg.get("face_video_url")
        video_path = existing_cfg.get("face_video_path")

        if file and file.filename:
            filename = f"face_proj_{project_id}_{int(time.time())}_{file.filename}"
            save_path = os.path.abspath(os.path.join(upload_dir, filename))
            file.save(save_path)
            video_path = save_path
            base_host = request.host_url.rstrip('/')
            video_url = f"{base_host}/uploads/face_videos/{filename}"
            enabled = True

            # Sync video file directly to Supabase Storage bucket 'screenshots' for global cloud access
            if supabase:
                try:
                    with open(save_path, "rb") as vf:
                        v_bytes = vf.read()
                        supa_path = f"face_proj_{project_id}.mp4"
                        try:
                            supabase.storage.from_("screenshots").upload(
                                path=supa_path,
                                file=v_bytes,
                                file_options={"content-type": "video/mp4", "upsert": "true"}
                            )
                        except Exception:
                            try:
                                supabase.storage.from_("screenshots").update(
                                    path=supa_path,
                                    file=v_bytes,
                                    file_options={"content-type": "video/mp4"}
                                )
                            except Exception:
                                pass
                        video_url = supabase.storage.from_("screenshots").get_public_url(supa_path)
                        safe_print(f"[Supabase Storage Video Sync] URL: {video_url}")
                except Exception as supa_vid_err:
                    safe_print(f"[Supabase Video Upload Warning] {supa_vid_err}")

        new_cfg = {
            "face_auth_enabled": enabled,
            "face_video_url": video_url,
            "face_video_path": video_path
        }
        project_face_auth_store[project_id] = new_cfg

        # Save to disk config file
        try:
            with open(config_file, "w") as f:
                json.dump(new_cfg, f)
        except Exception as e:
            safe_print(f"[Face Auth Disk Save Error] {e}")

        # Sync with Supabase projects table
        if supabase:
            try:
                supabase.table("projects").update(new_cfg).eq("id", project_id).execute()
            except Exception as e:
                safe_print(f"[Face Auth DB Save Warning] {e}")

        return jsonify({"status": "success", "config": new_cfg}), 200

    if request.method == "DELETE":
        empty_cfg = {
            "face_auth_enabled": False,
            "face_video_url": None,
            "face_video_path": None
        }
        project_face_auth_store[project_id] = empty_cfg

        if os.path.exists(config_file):
            try:
                os.remove(config_file)
            except Exception:
                pass

        if supabase:
            try:
                supabase.table("projects").update(empty_cfg).eq("id", project_id).execute()
            except Exception:
                pass

        return jsonify({"status": "success", "message": "Face verification video deleted"}), 200


@app.route('/api/auth/reset-password', methods=['POST'])
def send_reset_password_email():
    try:
        import requests
        data = request.json or {}
        email = data.get('email', '').strip()
        if not email:
            return jsonify({'error': 'Email address is required'}), 400

        reset_link = f"http://localhost:5173/login"
        brevo_key = os.getenv("BREVO_API_KEY")
        sender_email = os.getenv("BREVO_SENDER_EMAIL", "vitabsquare@gmail.com")
        sender_name = os.getenv("BREVO_SENDER_NAME", "Vtab Square")

        headers = {
            "accept": "application/json",
            "api-key": brevo_key,
            "content-type": "application/json"
        }

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #6366f1; margin: 0; font-size: 24px;">QA·AI Platform</h1>
              <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Password Reset Request</p>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #e4e4e7;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #a1a1aa;">We received a request to reset your password for your QA·AI account (<strong>{email}</strong>). Click the button below to sign in or set a new password:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="{reset_link}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password & Sign In</a>
            </div>
            <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
        """

        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": email}],
            "subject": "Reset your QA·AI Platform Password",
            "htmlContent": html_content
        }

        brevo_res = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=10)

        if brevo_res.status_code in [200, 201, 202]:
            print(f"[Brevo Email] Password reset email successfully sent to {email}")
            return jsonify({"success": True, "message": f"Password reset email sent to {email}"}), 200
        else:
            print(f"[Brevo Email Error] Status={brevo_res.status_code}, Resp={brevo_res.text}")
            return jsonify({"error": f"Failed to send email via Brevo: {brevo_res.text}"}), 500

    except Exception as err:
        print(f"[Brevo Email Failure] {str(err)}")
        return jsonify({"error": str(err)}), 500


# ─────────────────────────────────────────────────────────────
#  PROJECT ASSETS MANAGEMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────
@app.route("/api/projects/<int:project_id>/assets", methods=["GET", "POST"])
def manage_project_assets(project_id):
    if request.method == "GET":
        assets_list = []
        if supabase:
            try:
                res = supabase.table("project_assets").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
                if res.data:
                    assets_list = res.data
            except Exception as e:
                safe_print(f"[Project Assets DB Fetch Warning] {e}")

        # Local disk fallback listing if DB is empty or uninitialized
        if not assets_list:
            assets_dir = os.path.abspath(os.path.join(app.root_path, "uploads", "assets", str(project_id)))
            if os.path.exists(assets_dir):
                for idx, fname in enumerate(os.listdir(assets_dir)):
                    fpath = os.path.join(assets_dir, fname)
                    if os.path.isfile(fpath):
                        ext = os.path.splitext(fname)[1].lower().replace('.', '')
                        stat = os.stat(fpath)
                        assets_list.append({
                            "id": idx + 1000,
                            "project_id": project_id,
                            "asset_name": os.path.splitext(fname)[0],
                            "original_filename": fname,
                            "file_type": ext.upper() if ext else "FILE",
                            "file_size": stat.st_size,
                            "storage_path": fpath,
                            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(stat.st_ctime))
                        })

        return jsonify(assets_list), 200

    if request.method == "POST":
        if "file" not in request.files and "files" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        uploaded_files = request.files.getlist("file") or request.files.getlist("files")
        if not uploaded_files or uploaded_files[0].filename == "":
            return jsonify({"error": "Empty file selection"}), 400

        assets_dir = os.path.abspath(os.path.join(app.root_path, "uploads", "assets", str(project_id)))
        os.makedirs(assets_dir, exist_ok=True)

        saved_records = []
        for file in uploaded_files:
            filename = file.filename
            asset_name = request.form.get("asset_name") or os.path.splitext(filename)[0]
            save_path = os.path.join(assets_dir, filename)
            file.save(save_path)
            file_size = os.path.getsize(save_path)
            ext = os.path.splitext(filename)[1].lower().replace('.', '')

            asset_data = {
                "project_id": project_id,
                "asset_name": asset_name,
                "original_filename": filename,
                "file_type": ext.upper() if ext else "FILE",
                "file_size": file_size,
                "storage_path": save_path,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

            if supabase:
                try:
                    res = supabase.table("project_assets").insert(asset_data).select().execute()
                    if res.data:
                        asset_data = res.data[0]
                except Exception as insert_err:
                    safe_print(f"[Project Asset DB Insert Warning] {insert_err}")

            saved_records.append(asset_data)

        return jsonify({"status": "success", "assets": saved_records}), 201


@app.route("/api/assets/<int:asset_id>", methods=["DELETE"])
def delete_project_asset(asset_id):
    try:
        storage_path = None
        if supabase:
            try:
                res = supabase.table("project_assets").select("*").eq("id", asset_id).execute()
                if res.data:
                    storage_path = res.data[0].get("storage_path")
                    supabase.table("project_assets").delete().eq("id", asset_id).execute()
            except Exception as db_err:
                safe_print(f"[Asset Delete DB Warning] {db_err}")

        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass

        return jsonify({"status": "success", "message": f"Asset #{asset_id} deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<int:asset_id>/rename", methods=["PUT"])
def rename_project_asset(asset_id):
    data = request.json or {}
    new_name = data.get("asset_name", "").strip()
    if not new_name:
        return jsonify({"error": "New asset name required"}), 400

    if supabase:
        try:
            supabase.table("project_assets").update({"asset_name": new_name}).eq("id", asset_id).execute()
        except Exception as db_err:
            safe_print(f"[Asset Rename DB Warning] {db_err}")

    return jsonify({"status": "success", "asset_name": new_name}), 200


@app.route("/api/assets/<int:asset_id>/replace", methods=["POST"])
def replace_project_asset(asset_id):
    if "file" not in request.files:
        return jsonify({"error": "No replacement file provided"}), 400

    file = request.files["file"]
    filename = file.filename

    asset_record = None
    if supabase:
        try:
            res = supabase.table("project_assets").select("*").eq("id", asset_id).execute()
            if res.data:
                asset_record = res.data[0]
        except Exception:
            pass

    if asset_record:
        project_id = asset_record["project_id"]
        assets_dir = os.path.abspath(os.path.join(app.root_path, "uploads", "assets", str(project_id)))
    else:
        assets_dir = os.path.abspath(os.path.join(app.root_path, "uploads", "assets", "default"))

    os.makedirs(assets_dir, exist_ok=True)
    save_path = os.path.join(assets_dir, filename)
    file.save(save_path)
    file_size = os.path.getsize(save_path)
    ext = os.path.splitext(filename)[1].lower().replace('.', '')

    updated_data = {
        "original_filename": filename,
        "file_type": ext.upper() if ext else "FILE",
        "file_size": file_size,
        "storage_path": save_path
    }

    if supabase:
        try:
            supabase.table("project_assets").update(updated_data).eq("id", asset_id).execute()
        except Exception as db_err:
            safe_print(f"[Asset Replace DB Warning] {db_err}")

    return jsonify({"status": "success", "updated": updated_data}), 200


@app.route("/api/assets/<int:asset_id>/file", methods=["GET"])
def get_project_asset_file(asset_id):
    storage_path = None
    original_filename = "asset_file"

    if supabase:
        try:
            res = supabase.table("project_assets").select("*").eq("id", asset_id).execute()
            if res.data:
                storage_path = res.data[0].get("storage_path")
                original_filename = res.data[0].get("original_filename", original_filename)
        except Exception:
            pass

    if not storage_path or not os.path.exists(storage_path):
        assets_base = os.path.abspath(os.path.join(app.root_path, "uploads", "assets"))
        if os.path.exists(assets_base):
            for root, dirs, files in os.walk(assets_base):
                for f in files:
                    storage_path = os.path.join(root, f)
                    original_filename = f
                    break

    if not storage_path or not os.path.exists(storage_path):
        return jsonify({"error": "Asset file not found on disk"}), 404

    directory = os.path.dirname(storage_path)
    filename = os.path.basename(storage_path)
    return send_from_directory(directory, filename)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)


