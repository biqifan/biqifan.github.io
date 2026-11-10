# -*- coding: utf-8 -*-
"""只保留最大 alpha 连通域，去掉悬浮的碎发丝/斑点。"""
from PIL import Image
from collections import deque

DIR = r"C:\Users\98377\Desktop\范璧麒个人网站\images"
for name in ("view-front", "view-up", "view-right", "view-left"):
    p = r"%s\%s.png" % (DIR, name)
    img = Image.open(p).convert("RGBA")
    W, H = img.size
    a = img.getchannel("A").load()
    seen = bytearray(W * H)
    best_size, best_id = 0, -1
    comp_id = bytearray(W * H)   # 记录连通域编号
    cid = 0
    for sy in range(H):
        for sx in range(W):
            i = sy * W + sx
            if seen[i] or a[sx, sy] <= 128:
                continue
            cid += 1
            size = 0
            q = deque([(sx, sy)])
            seen[i] = 1
            while q:
                x, y = q.popleft()
                size += 1
                comp_id[y * W + x] = cid
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        j = ny * W + nx
                        if not seen[j] and a[nx, ny] > 128:
                            seen[j] = 1
                            q.append((nx, ny))
            if size > best_size:
                best_size, best_id = size, cid
    # 清除非最大连通域
    if best_id > 0:
        px = img.load()
        removed = 0
        for y in range(H):
            row = y * W
            for x in range(W):
                i = row + x
                if a[x, y] > 0 and comp_id[i] != best_id:
                    r, g, b, _ = px[x, y]
                    px[x, y] = (r, g, b, 0)
                    removed += 1
        img.save(p)
    print(name, "largest", best_size, "removed px", removed if best_id > 0 else 0)
print("done")
