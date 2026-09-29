import subprocess
import sys
res = subprocess.run(['docker', 'logs', '--tail', '200', 'winnie-the-gym-backend-1'], capture_output=True, text=True, encoding='utf-8', errors='ignore')
with open('backend_logs_utf8.txt', 'w', encoding='utf-8') as f:
    f.write(res.stderr)
