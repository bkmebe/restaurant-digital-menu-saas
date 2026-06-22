"""Phase 7 Report Generator
Usage: python tests/manual/generate-report.py [--format html|md|json]

Scans test output logs and builds a comprehensive QA audit report.
"""

import subprocess
import json
import sys
import os
from datetime import datetime

REPORT_FORMAT = sys.argv[1] if len(sys.argv) > 1 else 'html'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def run_vitest():
    result = subprocess.run(
        ['npx', 'vitest', 'run', '--reporter', 'json'],
        capture_output=True, text=True, cwd=BASE_DIR, timeout=120000
    )
    try:
        data = json.loads(result.stdout)
        return {
            'total': data.get('numTotalTests', 0),
            'passed': data.get('numPassedTests', 0),
            'failed': data.get('numFailedTests', 0),
            'duration_ms': data.get('startedTests', {}).get('duration', 0),
        }
    except (json.JSONDecodeError, AttributeError):
        return {'total': 0, 'passed': 0, 'failed': 0, 'error': result.stderr[:500]}

def run_playwright():
    result = subprocess.run(
        ['npx', 'playwright', 'test', '--reporter', 'json', 'tests/manual/'],
        capture_output=True, text=True, cwd=BASE_DIR, timeout=300000
    )
    try:
        # Parser for playwright JSON output (flatten suites)
        data = json.loads(result.stdout)
        total = passed = failed = 0
        def walk(suites):
            nonlocal total, passed, failed
            for s in suites:
                for spec in s.get('specs', []):
                    total += 1
                    for t in spec.get('tests', []):
                        status = t.get('status', '')
                        if status == 'passed':
                            passed += 1
                        elif status == 'failed':
                            failed += 1
                walk(s.get('suites', []))
        walk(data.get('suites', []))
        return {'total': total, 'passed': passed, 'failed': failed}
    except (json.JSONDecodeError, AttributeError):
        return {'total': 0, 'passed': 0, 'failed': 0, 'error': result.stderr[:500]}

def render_md(stats):
    lines = []
    lines.append(f'# QA Audit Report — {datetime.now().strftime("%Y-%m-%d %H:%M")}')
    lines.append('')
    lines.append('## Test Results')
    lines.append('')
    lines.append(f'| Suite | Total | Passed | Failed |')
    lines.append(f'|-------|-------|--------|--------|')
    for suite, s in stats.items():
        lines.append(f'| {suite} | {s.get("total", "?")} | {s.get("passed", "?")} | {s.get("failed", "?")} |')
    lines.append('')
    total_t = sum(s.get('total', 0) for s in stats.values())
    total_p = sum(s.get('passed', 0) for s in stats.values())
    total_f = sum(s.get('failed', 0) for s in stats.values())
    lines.append(f'**Total: {total_t} tests, {total_p} passed, {total_f} failed**')
    lines.append('')
    if total_f > 0:
        lines.append('### Failed Tests')
        lines.append('Check the individual test runner outputs for details.')
    return '\n'.join(lines)

def render_html(md_content):
    import markdown  # optional: pip install markdown
    html_body = markdown.markdown(md_content) if 'markdown' in sys.modules else f'<pre>{md_content}</pre>'
    return f'''<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>QA Audit Report</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ border: 1px solid #ccc; padding: 0.5rem; text-align: left; }}
  th {{ background: #f5f5f5; }}
  .fail {{ color: #d32f2f; font-weight: bold; }}
  .pass {{ color: #2e7d32; }}
</style>
</head>
<body>{html_body}</body></html>'''

def main():
    print('Running Phase 7 audit...')

    vitest = run_vitest()
    playwright = run_playwright()

    # We could also parse k6 JSON output here
    stats = {
        'Vitest (Unit/Integration)': vitest,
        'Playwright E2E (Manual)': playwright,
    }

    if REPORT_FORMAT == 'json':
        print(json.dumps(stats, indent=2))
    elif REPORT_FORMAT == 'html':
        md = render_md(stats)
        print(render_html(md))
    else:
        print(render_md(stats))

    total_f = sum(s.get('failed', 0) for s in stats.values())
    sys.exit(1 if total_f > 0 else 0)

if __name__ == '__main__':
    main()
