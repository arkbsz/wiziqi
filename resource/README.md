# Resource Folder

This folder stores the source image assets for the Gomoku project.

Runtime copies are still served from:

- `public/`
- `android/app/src/main/assets/public/`

Use the sync script below after replacing or adding materials:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-resource-assets.ps1
```

Current asset mapping:

- `cover.png`
- `cover_anim.gif`
- `board_top.jpeg`
- `board_bottom.jpeg`
- `board_left.jpeg`
- `board_right.jpeg`
- `startup.png`
- `win.png`
