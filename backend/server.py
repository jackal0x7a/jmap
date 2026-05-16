#!/usr/bin/env python3
"""
J-MAP Backend v2 - Flask + SQLite + Projects
"""

import sqlite3
import json
import re
import uuid
import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

DB_PATH = os.environ.get("DB_PATH", "/data/jmap.db")
PORT = 3747

app = Flask(__name__)
CORS(app)

# ─── Database ──────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS projects (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                is_active   INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS js_files (
                id           TEXT PRIMARY KEY,
                project_id   TEXT NOT NULL,
                url          TEXT NOT NULL,
                content      TEXT NOT NULL,
                size         INTEGER,
                source_page  TEXT,
                captured_at  TEXT,
                analyzed     INTEGER DEFAULT 0,
                content_type TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, url)
            );

            CREATE TABLE IF NOT EXISTS findings (
                id          TEXT PRIMARY KEY,
                file_id     TEXT NOT NULL,
                project_id  TEXT NOT NULL,
                type        TEXT,
                label       TEXT,
                severity    TEXT,
                value       TEXT,
                line_number INTEGER,
                url         TEXT,
                FOREIGN KEY (file_id) REFERENCES js_files(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS endpoints (
                id          TEXT PRIMARY KEY,
                project_id  TEXT NOT NULL,
                file_id     TEXT,
                endpoint    TEXT NOT NULL,
                method      TEXT,
                found_in_js INTEGER DEFAULT 0,
                line_number INTEGER,
                context     TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (file_id) REFERENCES js_files(id) ON DELETE CASCADE,
                UNIQUE(project_id, endpoint, file_id)
            );

            CREATE TABLE IF NOT EXISTS observed_requests (
                id           TEXT PRIMARY KEY,
                project_id   TEXT NOT NULL,
                url          TEXT NOT NULL,
                method       TEXT DEFAULT 'GET',
                status_code  INTEGER,
                source_page  TEXT,
                captured_at  TEXT,
                request_type TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, url, method)
            );

            CREATE INDEX IF NOT EXISTS idx_findings_file      ON findings(file_id);
            CREATE INDEX IF NOT EXISTS idx_findings_project   ON findings(project_id);
            CREATE INDEX IF NOT EXISTS idx_findings_severity  ON findings(severity);
            CREATE INDEX IF NOT EXISTS idx_files_project      ON js_files(project_id);
            CREATE INDEX IF NOT EXISTS idx_files_url          ON js_files(url);
            CREATE INDEX IF NOT EXISTS idx_endpoints_project  ON endpoints(project_id);
            CREATE INDEX IF NOT EXISTS idx_endpoints_file     ON endpoints(file_id);
            CREATE INDEX IF NOT EXISTS idx_observed_project   ON observed_requests(project_id);
            CREATE INDEX IF NOT EXISTS idx_observed_type      ON observed_requests(request_type);
        """)

def get_active_project(conn):
    return conn.execute('SELECT * FROM projects WHERE is_active = 1 LIMIT 1').fetchone()

# ─── Analyzer ─────────────────────────────────────────────────────────────────

PATTERNS = [
    ('api_paths',          'API Path',             'info',     r"""['\"`](\/?(?:api|v\d+|graphql|rest|gql|internal|admin|backend|service|auth|oauth|rpc)\/[^\s'\"`?#]{3,80})['\"`]"""),
    ('relative_paths',     'Relative Path',        'info',     r"""['\"`](\/[a-zA-Z0-9_\-\/]+(?:\/[a-zA-Z0-9_\-]+){1,8})['\"`]"""),
    ('absolute_urls',      'Absolute URL',         'info',     r"""https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]{10,200}"""),
    ('aws_access_key',     'AWS Access Key',       'critical', r"""(?<![A-Za-z0-9])(?:AKIA|AIPA|ASIA|AROA|ANPA|ANVA)[A-Z0-9]{16}(?![A-Za-z0-9])"""),
    ('google_api_key',     'Google API Key',       'critical', r"""(?<![A-Za-z0-9])AIza[0-9A-Za-z\-_]{35}(?![A-Za-z0-9\-_])"""),
    ('github_token',       'GitHub Token',         'critical', r"""(?<![A-Za-z0-9_])(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})(?![A-Za-z0-9_])"""),
    ('jwt_token',          'JWT Token',            'high',     r"""(?<![A-Za-z0-9\-_])eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+(?![A-Za-z0-9\-_])"""),
    ('bearer_token',       'Bearer Token',         'high',     r"""(?i)(?<![A-Za-z])[Bb]earer\s+[A-Za-z0-9\-._~+\/]{20,}=*"""),
    ('private_key',        'Private Key',          'critical', r"""-----BEGIN (?:RSA |EC )?PRIVATE KEY-----"""),
    ('stripe_key',         'Stripe Key',           'critical', r"""(?<![A-Za-z0-9_])(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}(?![A-Za-z0-9_])"""),
    ('sendgrid_key',       'SendGrid API Key',     'critical', r"""(?<![A-Za-z0-9])SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}(?![A-Za-z0-9\-_])"""),
    ('slack_token',        'Slack Token',          'high',     r"""(?<![A-Za-z0-9])xox[baprs]-[A-Za-z0-9\-]{10,72}(?![A-Za-z0-9])"""),
    ('firebase_config',    'Firebase Config',      'high',     r"""(?:apiKey|authDomain|databaseURL|projectId|storageBucket)\s*:\s*['\"`][^'\"`]{8,}['\"`]"""),
    ('hardcoded_password', 'Hardcoded Password',   'high',     r"""(?i)(?:password|passwd|pwd|secret)\s*[:=]\s*['\"`]([^'\"`\s]{8,50})['\"`]"""),
    ('hardcoded_username', 'Hardcoded Username',   'medium',   r"""(?i)(?:username|user|login)\s*[:=]\s*['\"`]([a-zA-Z0-9@._\-]{4,50})['\"`]"""),
    ('basic_auth',         'Basic Auth Header',    'high',     r"""(?i)Authorization\s*[:=]\s*['\"`]?Basic\s+[A-Za-z0-9+\/]{20,}=*"""),
    ('internal_ip',        'Internal IP',          'medium',   r"""(?<!\d)(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(?!\d)"""),
    ('localhost_url',      'Localhost URL',        'medium',   r"""https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?/[^\s'\"`]*"""),
    ('graphql_query',      'GraphQL Query',        'info',     r"""(?:query|mutation|subscription)\s+\w+\s*(?:\([^)]*\))?\s*\{"""),
    ('debug_mode',         'Debug Mode Enabled',   'low',      r"""(?<!\w)(?:debug|DEBUG)\s*[:=]\s*true"""),
    ('aws_secret',         'AWS Secret Key',       'critical', r"""(?i)(?:aws.{0,20})?(?:secret|key).{0,20}['\"`\s:=]+(?<![A-Za-z0-9\/+])([A-Za-z0-9\/+]{40})(?![A-Za-z0-9\/+])"""),
]

SEV_ORDER = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}

def analyze_content(content, url):
    findings = []
    seen = set()
    for type_, label, severity, pattern in PATTERNS:
        try:
            for m in re.finditer(pattern, content, re.IGNORECASE):
                value = (m.group(1) if m.lastindex else m.group(0)).strip()[:500]
                key = f"{type_}:{value}"
                if key in seen:
                    continue
                seen.add(key)
                line_num = content[:m.start()].count('\n') + 1
                findings.append({
                    'id': str(uuid.uuid4()),
                    'type': type_,
                    'label': label,
                    'severity': severity,
                    'value': value,
                    'line_number': line_num,
                    'url': url
                })
        except re.error:
            continue
    findings.sort(key=lambda f: SEV_ORDER.get(f['severity'], 99))
    return findings

def extract_endpoints(content):
    """Extract API endpoints from JS content"""
    endpoints = []
    seen = set()

    endpoint_patterns = [
        (r"""(?:fetch|axios|request)(?:\.\w+)?\s*\(\s*[`'"]([/][\w\-\/{}:]+)[`'"]""", 'GET'),
        (r"""(?:method\s*:\s*[`'"](\w+)[`'"][\s\S]{0,50}url\s*:\s*[`'"]([/][\w\-\/{}:]+)[`'"])""", None),
        (r"""[`'"](?:\/api\/|\/v\d+\/|\/graphql\/|\/rest\/)([^\s`'"?#]{3,100})[`'"]""", 'GET'),
        (r"""(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*[`'"]([/][\w\-\/{}:]+)[`'"]""", None),
        (r"""[`'"]([/][\w\-]+(?:\/[\w\-{}:]+){1,6})[`'"]""", 'GET'),
    ]

    for pattern, default_method in endpoint_patterns:
        try:
            for m in re.finditer(pattern, content, re.IGNORECASE):
                if m.lastindex and m.lastindex >= 2:
                    method = m.group(1).upper()
                    endpoint = m.group(2)
                else:
                    endpoint = m.group(1)
                    method = default_method or 'GET'

                endpoint = endpoint.strip()
                if len(endpoint) < 3 or len(endpoint) > 200:
                    continue

                if any(x in endpoint.lower() for x in ['.js', '.css', '.png', '.jpg', '.svg', '.ico', '.woff']):
                    continue

                key = f"{method}:{endpoint}"
                if key in seen:
                    continue
                seen.add(key)

                line_num = content[:m.start()].count('\n') + 1
                context = content[max(0, m.start()-50):min(len(content), m.end()+50)]

                endpoints.append({
                    'id': str(uuid.uuid4()),
                    'endpoint': endpoint,
                    'method': method,
                    'line_number': line_num,
                    'context': context.strip(),
                    'found_in_js': 1
                })
        except re.error:
            continue

    return endpoints


# ─── Project Routes ───────────────────────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def list_projects():
    with get_db() as conn:
        rows = conn.execute("""
            SELECT p.*,
                   COUNT(DISTINCT f.id) as file_count,
                   COUNT(DISTINCT fn.id) as finding_count
            FROM projects p
            LEFT JOIN js_files f ON f.project_id = p.id
            LEFT JOIN findings fn ON fn.project_id = p.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        """).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    name = (data or {}).get('name', '').strip()
    if not name:
        return jsonify({'error': 'name required'}), 400
    pid = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute('UPDATE projects SET is_active = 0')
        conn.execute(
            'INSERT INTO projects (id, name, created_at, is_active) VALUES (?,?,?,1)',
            (pid, name, datetime.utcnow().isoformat())
        )
    return jsonify({'ok': True, 'id': pid, 'name': name})

@app.route('/api/projects/active', methods=['GET'])
def active_project():
    with get_db() as conn:
        row = get_active_project(conn)
    if not row:
        return jsonify(None)
    return jsonify(dict(row))

@app.route('/api/projects/<pid>/activate', methods=['POST'])
def activate_project(pid):
    with get_db() as conn:
        row = conn.execute('SELECT id FROM projects WHERE id = ?', (pid,)).fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        conn.execute('UPDATE projects SET is_active = 0')
        conn.execute('UPDATE projects SET is_active = 1 WHERE id = ?', (pid,))
    return jsonify({'ok': True})

@app.route('/api/projects/<pid>', methods=['DELETE'])
def delete_project(pid):
    with get_db() as conn:
        conn.execute('DELETE FROM projects WHERE id = ?', (pid,))
        remaining = conn.execute('SELECT id FROM projects ORDER BY created_at DESC LIMIT 1').fetchone()
        if remaining:
            conn.execute('UPDATE projects SET is_active = 1 WHERE id = ?', (remaining['id'],))
    return jsonify({'ok': True})

@app.route('/api/projects/<pid>/stats', methods=['GET'])
def project_stats(pid):
    with get_db() as conn:
        total_files    = conn.execute('SELECT COUNT(*) FROM js_files WHERE project_id=?', (pid,)).fetchone()[0]
        total_findings = conn.execute('SELECT COUNT(*) FROM findings WHERE project_id=?', (pid,)).fetchone()[0]
        total_observed = conn.execute('SELECT COUNT(*) FROM observed_requests WHERE project_id=?', (pid,)).fetchone()[0]
        by_sev  = conn.execute('SELECT severity, COUNT(*) as count FROM findings WHERE project_id=? GROUP BY severity', (pid,)).fetchall()
        by_type = conn.execute('SELECT type, label, COUNT(*) as count FROM findings WHERE project_id=? GROUP BY type ORDER BY count DESC LIMIT 10', (pid,)).fetchall()
    return jsonify({
        'totalFiles': total_files,
        'totalFindings': total_findings,
        'totalObserved': total_observed,
        'bySeverity': [dict(r) for r in by_sev],
        'byType': [dict(r) for r in by_type]
    })

# ─── JS File Routes ────────────────────────────────────────────────────────────

@app.route('/api/js-files', methods=['POST'])
def receive_file():
    data = request.get_json()
    if not data or not data.get('url') or not data.get('content'):
        return jsonify({'error': 'url and content required'}), 400

    with get_db() as conn:
        project = get_active_project(conn)
        if not project:
            return jsonify({'error': 'No active project. Create one in the dashboard first.'}), 409

        pid = project['id']
        url = data['url']
        content = data['content']
        file_id = data.get('id') or str(uuid.uuid4())

        existing = conn.execute('SELECT id FROM js_files WHERE project_id=? AND url=?', (pid, url)).fetchone()
        if existing:
            return jsonify({'ok': True, 'duplicate': True, 'id': existing['id']})

        conn.execute(
            'INSERT INTO js_files (id, project_id, url, content, size, source_page, captured_at, content_type) VALUES (?,?,?,?,?,?,?,?)',
            (file_id, pid, url, content, data.get('size', len(content)),
             data.get('sourcePageUrl', ''), data.get('capturedAt', datetime.utcnow().isoformat()),
             data.get('contentType', 'application/javascript'))
        )

        findings = analyze_content(content, url)
        for f in findings:
            conn.execute(
                'INSERT INTO findings (id, file_id, project_id, type, label, severity, value, line_number, url) VALUES (?,?,?,?,?,?,?,?,?)',
                (f['id'], file_id, pid, f['type'], f['label'], f['severity'], f['value'], f['line_number'], f['url'])
            )

        endpoints = extract_endpoints(content)
        for ep in endpoints:
            try:
                conn.execute(
                    'INSERT OR IGNORE INTO endpoints (id, project_id, file_id, endpoint, method, found_in_js, line_number, context) VALUES (?,?,?,?,?,?,?,?)',
                    (ep['id'], pid, file_id, ep['endpoint'], ep['method'], ep['found_in_js'], ep['line_number'], ep['context'])
                )
            except Exception:
                pass

        conn.execute('UPDATE js_files SET analyzed=1 WHERE id=?', (file_id,))

    return jsonify({'ok': True, 'id': file_id, 'findings': len(findings), 'project_id': pid})


@app.route('/api/js-files', methods=['GET'])
def list_files():
    pid = request.args.get('project_id')
    search = request.args.get('search', '')
    severity = request.args.get('severity', '')

    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify([])

        query = """
            SELECT f.id, f.url, f.size, f.source_page, f.captured_at, f.analyzed, f.content_type,
                   COUNT(DISTINCT fn.id) as finding_count,
                   MAX(CASE fn.severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END) as max_severity_num
            FROM js_files f
            LEFT JOIN findings fn ON fn.file_id = f.id
            WHERE f.project_id = ?
        """
        params = [pid]
        if search:
            query += ' AND (f.url LIKE ? OR f.source_page LIKE ?)'
            params += [f'%{search}%', f'%{search}%']
        if severity:
            query += ' AND fn.severity = ?'
            params.append(severity)
        query += ' GROUP BY f.id ORDER BY f.captured_at DESC'

        rows = conn.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/js-files/<file_id>', methods=['GET'])
def get_file(file_id):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM js_files WHERE id=?', (file_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(row))


@app.route('/api/js-files/<file_id>/findings', methods=['GET'])
def get_file_findings(file_id):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM findings WHERE file_id=? ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END",
            (file_id,)
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/js-files/<file_id>/analyze', methods=['POST'])
def reanalyze_file(file_id):
    with get_db() as conn:
        row = conn.execute('SELECT * FROM js_files WHERE id=?', (file_id,)).fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        pid = row['project_id']
        conn.execute('DELETE FROM findings WHERE file_id=?', (file_id,))
        findings = analyze_content(row['content'], row['url'])
        for f in findings:
            conn.execute(
                'INSERT INTO findings (id, file_id, project_id, type, label, severity, value, line_number, url) VALUES (?,?,?,?,?,?,?,?,?)',
                (f['id'], file_id, pid, f['type'], f['label'], f['severity'], f['value'], f['line_number'], f['url'])
            )
    return jsonify({'ok': True, 'findings': len(findings), 'results': findings})


@app.route('/api/js-files/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    with get_db() as conn:
        conn.execute('DELETE FROM findings WHERE file_id=?', (file_id,))
        conn.execute('DELETE FROM js_files WHERE id=?', (file_id,))
    return jsonify({'ok': True})


# ─── Findings Routes ──────────────────────────────────────────────────────────

@app.route('/api/findings', methods=['GET'])
def list_findings():
    pid = request.args.get('project_id')
    severity = request.args.get('severity', '')
    type_ = request.args.get('type', '')
    search = request.args.get('search', '')

    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify([])

        query = """
            SELECT fn.*, f.url as file_url, f.source_page
            FROM findings fn
            JOIN js_files f ON f.id = fn.file_id
            WHERE fn.project_id = ?
        """
        params = [pid]
        if severity:
            query += ' AND fn.severity=?'; params.append(severity)
        if type_:
            query += ' AND fn.type=?'; params.append(type_)
        if search:
            query += ' AND (fn.value LIKE ? OR fn.label LIKE ?)'; params += [f'%{search}%', f'%{search}%']

        query += " ORDER BY CASE fn.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, fn.label"
        rows = conn.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


# ─── Endpoints Routes ─────────────────────────────────────────────────────────

@app.route('/api/endpoints', methods=['GET'])
def list_endpoints():
    pid = request.args.get('project_id')
    search = request.args.get('search', '')
    method = request.args.get('method', '')
    found_in_js = request.args.get('found_in_js', '')

    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify([])

        query = """
            SELECT e.*, f.url as file_url
            FROM endpoints e
            LEFT JOIN js_files f ON f.id = e.file_id
            WHERE e.project_id = ?
        """
        params = [pid]
        if search:
            query += ' AND (e.endpoint LIKE ? OR e.context LIKE ?)'
            params += [f'%{search}%', f'%{search}%']
        if method:
            query += ' AND e.method = ?'
            params.append(method)
        if found_in_js:
            query += ' AND e.found_in_js = ?'
            params.append(1 if found_in_js == '1' else 0)

        query += " ORDER BY e.method, e.endpoint"
        rows = conn.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


# ─── Observed Requests Routes ─────────────────────────────────────────────────

@app.route('/api/observed-requests', methods=['POST'])
def receive_observed_requests():
    data = request.get_json()
    if not data or not isinstance(data.get('requests'), list):
        return jsonify({'error': 'requests array required'}), 400

    with get_db() as conn:
        project = get_active_project(conn)
        if not project:
            return jsonify({'error': 'No active project'}), 409
        pid = project['id']

        inserted = 0
        for req in data['requests']:
            url = req.get('url', '').strip()
            if not url:
                continue
            # Skip the J-MAP backend itself and chrome-extension:// urls
            if 'localhost:3747' in url or url.startswith('chrome-extension://'):
                continue
            try:
                conn.execute(
                    '''INSERT OR IGNORE INTO observed_requests
                       (id, project_id, url, method, status_code, source_page, captured_at, request_type)
                       VALUES (?,?,?,?,?,?,?,?)''',
                    (str(uuid.uuid4()), pid, url,
                     req.get('method', 'GET').upper(),
                     req.get('statusCode'),
                     req.get('sourcePage', ''),
                     req.get('capturedAt', datetime.utcnow().isoformat()),
                     req.get('type', 'other'))
                )
                inserted += 1
            except Exception:
                pass

    return jsonify({'ok': True, 'inserted': inserted})


@app.route('/api/observed-requests', methods=['GET'])
def list_observed_requests():
    pid = request.args.get('project_id')
    search = request.args.get('search', '')
    req_type = request.args.get('type', '')
    method = request.args.get('method', '')

    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify([])

        query = "SELECT * FROM observed_requests WHERE project_id = ?"
        params = [pid]
        if search:
            query += ' AND (url LIKE ? OR source_page LIKE ?)'; params += [f'%{search}%', f'%{search}%']
        if req_type:
            query += ' AND request_type = ?'; params.append(req_type)
        if method:
            query += ' AND method = ?'; params.append(method)
        query += ' ORDER BY captured_at DESC'

        rows = conn.execute(query, params).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/observed-requests', methods=['DELETE'])
def clear_observed_requests():
    pid = request.args.get('project_id')
    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify({'error': 'No active project'}), 409
        conn.execute('DELETE FROM observed_requests WHERE project_id = ?', (pid,))
    return jsonify({'ok': True})


# ─── Stats Route ──────────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
def stats():
    pid = request.args.get('project_id')
    with get_db() as conn:
        if not pid:
            project = get_active_project(conn)
            pid = project['id'] if project else None
        if not pid:
            return jsonify({'totalFiles': 0, 'totalFindings': 0, 'totalEndpoints': 0, 'totalObserved': 0, 'bySeverity': [], 'byType': []})

        total_files     = conn.execute('SELECT COUNT(*) FROM js_files WHERE project_id=?', (pid,)).fetchone()[0]
        total_findings  = conn.execute('SELECT COUNT(*) FROM findings WHERE project_id=?', (pid,)).fetchone()[0]
        total_endpoints = conn.execute('SELECT COUNT(DISTINCT endpoint) FROM endpoints WHERE project_id=?', (pid,)).fetchone()[0]
        total_observed  = conn.execute('SELECT COUNT(*) FROM observed_requests WHERE project_id=?', (pid,)).fetchone()[0]
        by_sev          = conn.execute('SELECT severity, COUNT(*) as count FROM findings WHERE project_id=? GROUP BY severity', (pid,)).fetchall()
        by_type         = conn.execute('SELECT type, label, COUNT(*) as count FROM findings WHERE project_id=? GROUP BY type ORDER BY count DESC LIMIT 10', (pid,)).fetchall()
        by_req_type     = conn.execute('SELECT request_type, COUNT(*) as count FROM observed_requests WHERE project_id=? GROUP BY request_type', (pid,)).fetchall()

    return jsonify({
        'totalFiles': total_files,
        'totalFindings': total_findings,
        'totalEndpoints': total_endpoints,
        'totalObserved': total_observed,
        'bySeverity': [dict(r) for r in by_sev],
        'byType': [dict(r) for r in by_type],
        'byRequestType': [dict(r) for r in by_req_type]
    })


if __name__ == '__main__':
    init_db()
    print(f"\n🎯 J-MAP Backend v2 running on http://localhost:{PORT}")
    print(f"   Database: {DB_PATH}\n")
    app.run(host='0.0.0.0', port=PORT, debug=False)