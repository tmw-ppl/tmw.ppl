# GitHub Pages Deployment Guide

This guide explains how to deploy the tmw.ppl React application to GitHub Pages.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git repository with GitHub Pages enabled

## Setup GitHub Pages

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Source", select "GitHub Actions"
   - Save the settings

2. **Configure repository permissions:**
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

The project includes a GitHub Actions workflow that automatically deploys when you push to the `main` branch.

1. **Push your changes to the main branch:**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

2. **Monitor the deployment:**
   - Go to your repository on GitHub
   - Click on the "Actions" tab
   - Watch the "Deploy to GitHub Pages" workflow

### Method 2: Manual Deployment

Use the provided deployment script for manual deployments:

```bash
# Make sure you're in the project root directory
./deploy.sh
```

Or run the npm scripts directly:

```bash
# Build and deploy
npm run build:gh

# Or step by step
npm run build
npm run deploy
```

### Method 3: Direct gh-pages Command

```bash
# Build the project
npm run build

# Deploy to GitHub Pages
npx gh-pages -d dist
```

## Configuration

### Base URL Configuration

The app is configured to work with GitHub Pages subdirectory structure:

- **Base URL:** `/TMR_PPL/`
- **Repository:** `https://github.com/sergeypiterman/TMR_PPL`
- **Live URL:** `https://sergeypiterman.github.io/TMR_PPL`

### Environment Variables

Make sure your Supabase environment variables are properly configured for production:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Common Issues

1. **404 Errors on Refresh:**
   - This is normal for SPAs on GitHub Pages
   - Users should navigate using the app's navigation, not browser refresh
   - Consider using a custom 404.html redirect if needed

2. **Assets Not Loading:**
   - Check that the `base` URL in `vite.config.ts` matches your repository name
   - Ensure all asset paths are relative

3. **Build Failures:**
   - Check that all dependencies are installed
   - Verify TypeScript compilation passes
   - Ensure no linting errors

### Checking Deployment Status

1. **GitHub Actions:**
   - Go to Actions tab in your repository
   - Check the latest workflow run

2. **GitHub Pages:**
   - Go to Settings → Pages
   - Check the deployment status and URL

3. **Live Site:**
   - Visit your GitHub Pages URL
   - Check browser console for any errors

## Custom Domain (Optional)

If you have a custom domain:

1. **Add CNAME file to the root:**
   ```
   your-domain.com
   ```

2. **Update the GitHub Actions workflow:**
   ```yaml
   with:
     cname: your-domain.com
   ```

3. **Configure DNS:**
   - Point your domain to GitHub Pages servers
   - Add CNAME record: `www.your-domain.com` → `sergeypiterman.github.io`

## Performance Optimization

The build is configured with:
- Code splitting for better loading performance
- Asset optimization
- Source maps disabled for production
- Manual chunks for vendor libraries

## Security Notes

- The GitHub Actions workflow uses `GITHUB_TOKEN` for authentication
- No sensitive data should be committed to the repository
- Environment variables should be configured in the GitHub repository settings
