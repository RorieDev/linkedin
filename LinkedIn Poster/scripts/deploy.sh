#!/bin/bash

# LinkedIn Poster - Render Deployment Script
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 LinkedIn Poster Deployment Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes!${NC}"
    echo ""
    echo "Uncommitted changes:"
    git status -s
    echo ""
    read -p "Commit and push before deploying? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Enter commit message:${NC}"
        read commit_msg
        git add -A
        git commit -m "$commit_msg

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
        echo -e "${GREEN}✅ Changes committed${NC}"
    fi
fi

# Push to GitHub
echo -e "${BLUE}Pushing to GitHub...${NC}"
if git push; then
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
else
    echo -e "${RED}❌ Push failed. Check your connection and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Deployment options:${NC}"
echo ""
echo "1️⃣  Automatic deployment via GitHub Actions (recommended)"
echo "   - Already triggered by git push"
echo "   - Status: https://github.com/RorieDev/linkedin/actions"
echo ""
echo "2️⃣  Manual deployment via Render Dashboard"
echo "   - https://dashboard.render.com"
echo "   - Service: linkedin-poster-api"
echo "   - Click 'Deploy latest commit' button"
echo ""
echo "3️⃣  Manual deployment via Render CLI"
echo "   - render deploy --service linkedin-poster-api"
echo ""

# Optional: Try to get deployment status
echo -e "${BLUE}Checking GitHub Actions status...${NC}"
if command -v gh &> /dev/null; then
    echo ""
    gh run list --repo RorieDev/linkedin --limit 1
    echo ""
    echo -e "${BLUE}Full status: https://github.com/RorieDev/linkedin/actions${NC}"
else
    echo "GitHub CLI not installed. Install with: brew install gh"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check build status at: ${YELLOW}https://dashboard.render.com${NC}"
echo "2. Expected build time: 3-5 minutes"
echo "3. Once 'Live', test at: ${YELLOW}https://linkedin-poster-api.onrender.com${NC}"
echo ""
echo -e "${GREEN}Deployment initiated! 🎉${NC}"
