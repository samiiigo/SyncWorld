# Design resources

Local copies of the design repos SyncWorld draws on. The cloned folders are kept out of git (see `.gitignore`), so only this README is committed.

To get them on another machine, run this from `SyncWorld/design-resources/`:

```bash
git clone --depth 1 https://github.com/ruucm/shadergradient.git
git clone --depth 1 https://github.com/pmndrs/react-three-fiber.git
git clone --depth 1 https://github.com/dashersw/liquid-glass-js.git
git clone --depth 1 https://github.com/elayadesign/ai-design-skills.git
```

| Folder | Link | Used for |
|---|---|---|
| `shadergradient` | https://github.com/ruucm/shadergradient | The animated sky (`src/shared/visuals/ShaderGradient.tsx`) and the sun orb |
| `react-three-fiber` | https://github.com/pmndrs/react-three-fiber | The 3D globe and sun orb |
| `liquid-glass-js` | https://github.com/dashersw/liquid-glass-js | Edge refraction on glass surfaces on web (`src/shared/visuals/glass/`) |
| `ai-design-skills` | https://github.com/elayadesign/ai-design-skills | The `figma-designer` rules the Figma file was built to |

The agent skills (unslop, karpathy-guidelines and others) live in `../.claude/skills/`.
