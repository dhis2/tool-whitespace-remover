"""Install the built app zip into a DHIS2 instance via POST /api/apps.

Usage: python3 install_app.py <base_url> <zip_path>
"""
import base64
import sys
import urllib.request
import uuid

BASE, ZIP = sys.argv[1], sys.argv[2]
USER, PASS = "admin", "district"

boundary = uuid.uuid4().hex
with open(ZIP, "rb") as f:
    zip_bytes = f.read()

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="app.zip"\r\n'
    f"Content-Type: application/zip\r\n\r\n"
).encode() + zip_bytes + f"\r\n--{boundary}--\r\n".encode()

req = urllib.request.Request(
    f"{BASE}/api/apps",
    data=body,
    headers={
        "Authorization": "Basic "
        + base64.b64encode(f"{USER}:{PASS}".encode()).decode(),
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    },
    method="POST",
)
with urllib.request.urlopen(req, timeout=300) as r:
    print("install status:", r.status)

# verify
req = urllib.request.Request(
    f"{BASE}/api/apps.json",
    headers={
        "Authorization": "Basic "
        + base64.b64encode(f"{USER}:{PASS}".encode()).decode()
    },
)
with urllib.request.urlopen(req, timeout=60) as r:
    import json

    apps = json.load(r)
    apps = apps if isinstance(apps, list) else apps.get("apps", apps)
    keys = [a.get("key") for a in apps]
    print("whitespace-cleaner installed:", "whitespace-cleaner" in keys)
