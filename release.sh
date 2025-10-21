#!/bin/bash

# Release script for BRAT-compatible Obsidian plugin
# Usage: ./release.sh <version>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 2.1.0"
    exit 1
fi

VERSION=$1

echo "🚀 Releasing version $VERSION..."

# Update package.json version
echo "📝 Updating package.json version..."
npm version $VERSION --no-git-tag-version

# Run version bump script
echo "📝 Updating manifest.json and versions.json..."
npm run version

# Build the plugin
echo "🔨 Building plugin..."
npm run build

# Copy files to deployment folder
echo "📦 Copying files to deployment folder..."
npm run copy-files

# Create git tag
echo "🏷️  Creating git tag..."
git add .
git commit -m "Release version $VERSION"
git tag $VERSION

echo "✅ Release $VERSION prepared!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub: git push && git push --tags"
echo "2. GitHub Actions will automatically create the release"
echo "3. Users can install via BRAT using the repository URL"
echo ""
echo "BRAT installation URL: https://github.com/yourusername/obsidian-kanban-board"