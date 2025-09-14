#!/bin/bash

# GitHub Pages Deployment Script for tmw.ppl React App
# This script builds the React app and deploys it to GitHub Pages

echo "🚀 Starting GitHub Pages deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. dist directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to GitHub Pages
echo "🌐 Deploying to GitHub Pages..."
npm run deploy

# Check deployment status
if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "📍 Your app should be available at: https://sergeypiterman.github.io/TMR_PPL"
    echo ""
    echo "⏳ Note: It may take a few minutes for the changes to be visible."
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
