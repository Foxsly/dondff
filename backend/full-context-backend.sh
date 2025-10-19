mkdir -p _ctx/src _ctx/config
# adjust paths as needed:
rsync -a src/ _ctx/src/
cp package.json _ctx/
cp tsconfig.json _ctx/ 2>/dev/null || true
zip -r context-full-backend.zip _ctx