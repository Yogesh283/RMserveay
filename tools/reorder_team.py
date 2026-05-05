# one-off: move Total team RmsCard above Direct referrals
from pathlib import Path

p = Path(r"d:\xampp\htdocs\RAMSERVE\resources\js\member\pages\MemberTeamPage.jsx")
text = p.read_text(encoding="utf-8")
start_data = "            {data ? (\n                <>\n"
i0 = text.find(start_data)
if i0 < 0:
    raise SystemExit("start not found")
i1 = i0 + len(start_data)

d0 = text.find('                    <RmsCard variant="neon"', i1)
needle = '                    <RmsCard variant="elevated" className="!p-4 sm:!p-5">\n                        <h2 className="text-lg font-bold text-white">2. Total team</h2>'
t_start = text.find(needle, d0)
if t_start < 0:
    raise SystemExit("total team not found")
t_end_marker = '                    <RmsCard variant="elevated" className="!p-4 sm:!p-5">\n                        <h2 className="text-lg font-bold text-white">3. Binary matching</h2>'
t_end = text.find(t_end_marker, t_start)
if t_end < 0:
    raise SystemExit("binary not found")
total_block = text[t_start:t_end]

text2 = text[:t_start] + text[t_end:]
i0 = text2.find(start_data)
i1 = i0 + len(start_data)
text3 = text2[:i1] + total_block + text2[i1:]
p.write_text(text3, encoding="utf-8", newline="\n")
print("ok")
