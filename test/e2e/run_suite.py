"""Functional test suite for the Whitespace Cleaner app (installed in DHIS2).

Usage: python3 run_suite.py <base_url> <label>
e.g.   python3 run_suite.py http://dhis2-agent-ws-41-sl:8080 41-sl

Assumes seed_metadata.py has been run against the instance and the app
zip has been installed (app key: whitespace-cleaner).

Writes results JSON to results/<label>.json and screenshots to
results/<label>-*.png.
"""
import json
import os
import re
import sys
import time
import urllib.parse

from playwright.sync_api import sync_playwright

from d2 import get, login_cookie

BASE = sys.argv[1]
LABEL = sys.argv[2]
APP_URL = f"{BASE}/api/apps/whitespace-cleaner/index.html"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)

results = []
console_errors = []
page_errors = []
http_errors = []


def record(step, ok, detail=""):
    results.append({"step": step, "ok": bool(ok), "detail": str(detail)[:400]})
    print(f"  [{'PASS' if ok else 'FAIL'}] {step} {detail}")


def shot(page, name):
    page.screenshot(path=f"{OUT}/{LABEL}-{name}.png", full_page=True)


def api_field(path, obj_type, uid, field):
    status, data = get(BASE, f"/api/{obj_type}/{uid}.json?fields={field}")
    if status != 200:
        return None
    return (data or {}).get(field)


SCAN_DONE = (
    "[data-test='dhis2-uicore-tabbar'], [data-test='dhis2-uicore-noticebox']"
)


def wait_scan_done(page):
    """Wait for the scan to finish; returns the frame the app lives in.

    On 2.41 the app is served directly; on 2.42+ the global shell wraps
    it in an iframe, so we look for the selector in every frame.
    """
    deadline = time.time() + 180
    while time.time() < deadline:
        for f in page.frames:
            try:
                if f.query_selector(SCAN_DONE):
                    return f
            except Exception:
                pass
        page.wait_for_timeout(500)
    raise TimeoutError("scan did not complete in any frame")


def tab_for(root, label_re):
    return root.locator("[data-test='dhis2-uicore-tab']", has_text=label_re)


def row_for(root, text):
    return root.locator("[data-test='metadata-row']", has_text=text)


def main():
    ignore_console = re.compile(
        r"favicon|manifest|Download the React DevTools|service.?worker|"
        r"third-party cookie|moment locale",
        re.I,
    )
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        host = urllib.parse.urlparse(BASE).hostname
        ctx = browser.new_context(viewport={"width": 1600, "height": 1000})
        cn, cv = login_cookie(BASE)
        ctx.add_cookies(
            [
                {
                    "name": cn,
                    "value": cv,
                    "domain": host,
                    "path": "/",
                    "httpOnly": True,
                    "sameSite": "Lax",
                }
            ]
        )
        page = ctx.new_page()
        page.on(
            "console",
            lambda m: console_errors.append(m.text)
            if m.type == "error" and not ignore_console.search(m.text)
            else None,
        )
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.on(
            "response",
            lambda r: http_errors.append((r.status, r.url))
            if r.status >= 400 and "favicon" not in r.url
            else None,
        )

        # ---- Step 1: app loads and scan completes
        page.goto(APP_URL)
        try:
            root = wait_scan_done(page)
            record("app loads, scan completes", True)
        except Exception as e:
            shot(page, "scan-timeout")
            record("app loads, scan completes", False, e)
            raise
        shot(page, "1-loaded")

        # ---- Step 2: data elements tab present with seeded rows
        de_tab = tab_for(root, re.compile("Data elements", re.I))
        ok = de_tab.count() > 0
        record("data elements tab present", ok, f"count={de_tab.count()}")
        if ok:
            de_tab.first.click()
            page.wait_for_timeout(300)

        row_a = row_for(root, "AgentWsDe01")
        record("seeded row AgentWsDe01 visible", row_a.count() == 1)

        # ---- pagination control present with total count
        pagination = root.locator("[data-test='dhis2-uiwidgets-pagination']")
        record(
            "pagination control present",
            pagination.count() == 1,
            pagination.first.inner_text()[:80].replace("\n", " ")
            if pagination.count()
            else "",
        )

        # ---- Step 3: whitespace highlighted
        marks = row_a.locator("mark")
        record(
            "whitespace highlighted (marks present)",
            marks.count() >= 3,
            f"marks={marks.count()}",
        )
        shot(page, "2-dataelements")

        # ---- Step 4: single check -> Ready
        row_a.locator("[data-test='check-button']").click()
        try:
            row_a.locator("[data-test='dhis2-uicore-tag']", has_text="Ready").wait_for(
                timeout=30_000
            )
            record("single check -> Ready", True)
        except Exception as e:
            shot(page, "check-fail")
            record("single check -> Ready", False, e)

        # ---- Step 5: single fix -> row removed, API cleaned
        row_a.locator("[data-test='fix-button']").click()
        try:
            row_a.wait_for(state="detached", timeout=30_000)
            record("single fix removes row", True)
        except Exception as e:
            shot(page, "fix-fail")
            record("single fix removes row", False, e)
        name = api_field("/", "dataElements", "AgentWsDe01", "name")
        record(
            "API: name cleaned",
            name == "AGENT WS Test A double",
            repr(name),
        )
        code = api_field("/", "dataElements", "AgentWsDe01", "code")
        record("API: code cleaned", code == "AGENTWSA", repr(code))
        short = api_field("/", "dataElements", "AgentWsDe01", "shortName")
        record("API: shortName cleaned", short == "AGENT WS Test A", repr(short))

        # ---- Step 6: conflict detection
        row_b = row_for(root, "AgentWsDe03")
        record("conflict row AgentWsDe03 visible", row_b.count() == 1)
        row_b.locator("[data-test='check-button']").click()
        try:
            root.wait_for_selector(
                "[data-test='conflict-summary-modal']", timeout=30_000
            )
            record("conflict modal shown", True)
            modal_text = root.locator(
                "[data-test='conflict-summary-modal']"
            ).inner_text()
            record(
                "conflict lists AgentWsDe02",
                "AgentWsDe02" in modal_text,
                modal_text[:200].replace("\n", " "),
            )
            shot(page, "3-conflict-modal")
            root.locator(
                "[data-test='conflict-summary-modal'] button", has_text="Close"
            ).click()
        except Exception as e:
            shot(page, "conflict-fail")
            record("conflict modal shown", False, e)
        tag = row_b.locator("[data-test='dhis2-uicore-tag']", has_text="Conflict")
        record("row tagged Conflict", tag.count() == 1)

        # ---- Step 7: org units - same cleaned name must NOT conflict
        ou_tab = tab_for(root, re.compile("Organisation units", re.I))
        record("org units tab present", ou_tab.count() > 0)
        if ou_tab.count():
            ou_tab.first.click()
            page.wait_for_timeout(300)
            row_ou = row_for(root, "AgentWsOu02")
            record("seeded OU row visible", row_ou.count() == 1)
            row_ou.locator("[data-test='check-button']").click()
            try:
                row_ou.locator(
                    "[data-test='dhis2-uicore-tag']", has_text="Ready"
                ).wait_for(timeout=30_000)
                record("OU duplicate name -> Ready (no conflict)", True)
            except Exception as e:
                shot(page, "ou-check-fail")
                record("OU duplicate name -> Ready (no conflict)", False, e)
            row_ou.locator("[data-test='fix-button']").click()
            try:
                row_ou.wait_for(state="detached", timeout=30_000)
                record("OU fix removes row", True)
            except Exception as e:
                record("OU fix removes row", False, e)
            ou_name = api_field("/", "organisationUnits", "AgentWsOu02", "name")
            record("API: OU name cleaned", ou_name == "AGENT WS OU", repr(ou_name))
            shot(page, "4-orgunits")

        # ---- Step 8: bulk check-selected on data elements (select all)
        de_tab = tab_for(root, re.compile("Data elements", re.I))
        if de_tab.count():
            de_tab.first.click()
            page.wait_for_timeout(300)
            root.locator("[data-test='select-all'] input").check(force=True)
            root.locator("[data-test='check-selected']").click()
            try:
                root.wait_for_selector(
                    "[data-test='conflict-summary-modal']", timeout=120_000
                )
                record("bulk check shows summary modal", True)
                shot(page, "5-bulk-summary")
                root.locator(
                    "[data-test='conflict-summary-modal'] button",
                    has_text="Close",
                ).click()
            except Exception as e:
                shot(page, "bulk-fail")
                record("bulk check shows summary modal", False, e)
            # fix-selected enabled only if >=1 selected and all ready
            fix_btn = root.locator("[data-test='fix-selected']")
            record(
                "fix-selected state resolved",
                fix_btn.count() == 1,
                f"disabled={fix_btn.first.is_disabled()}",
            )

        shot(page, "9-final")
        browser.close()

    passed = sum(1 for r in results if r["ok"])
    summary = {
        "label": LABEL,
        "base": BASE,
        "passed": passed,
        "failed": len(results) - passed,
        "results": results,
        "console_errors": console_errors[:20],
        "page_errors": page_errors[:10],
        "http_errors": [f"{s} {u}" for s, u in http_errors[:20]],
    }
    with open(f"{OUT}/{LABEL}.json", "w") as f:
        json.dump(summary, f, indent=2)
    print(
        f"\n== {LABEL}: {passed}/{len(results)} passed; "
        f"console_errors={len(console_errors)} page_errors={len(page_errors)} "
        f"http_errors={len(http_errors)}"
    )


if __name__ == "__main__":
    main()
