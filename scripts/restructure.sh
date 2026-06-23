#!/bin/bash
# restructure.sh — Restructure the project into a monorepo format.

set -e

# Go to repository root
cd "$(dirname "$0")/.."

echo "Creating frontend/ and backend/ directories..."
mkdir -p frontend
mkdir -p backend

# Files to move to frontend/
FILES_TO_MOVE=(
  "src"
  "public"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "tsconfig.app.json"
  "tsconfig.node.json"
  "vite.config.ts"
  "tailwind.config.js"
  "postcss.config.js"
  "index.html"
  "node_modules"
  "vercel.json"
)

echo "Moving files to frontend/..."
for item in "${FILES_TO_MOVE[@]}"; do
  if [ -e "$item" ]; then
    mv "$item" frontend/
  fi
done

# Create root package.json for npm workspaces
echo "Creating root package.json for workspaces..."
cat << 'EOF' > package.json
{
  "name": "embedded-collective-root",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=frontend",
    "build:frontend": "npm run build --workspace=frontend",
    "dev:backend": "npm run dev --workspace=backend"
  }
}
EOF

echo "Repository restructured successfully!"
