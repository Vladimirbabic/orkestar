# Deployment Guide

## Quick Start

### 1. Prepare Your Repository

1. Initialize Git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a GitHub repository and push:
```bash
git remote add origin https://github.com/yourusername/workflow-builder.git
git branch -M main
git push -u origin main
```

### 2. Set Up Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### 3. Configure GitHub Secrets for CI/CD

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **VERCEL_TOKEN**
   - Get from: Vercel Dashboard → Settings → Tokens
   - Create a new token with full access

2. **VERCEL_ORG_ID**
   - Get from: Vercel Dashboard → Settings → General
   - Copy "Team ID" or "User ID"

3. **VERCEL_PROJECT_ID**
   - Get from: Vercel project settings → General
   - Copy "Project ID"

4. **NEXT_PUBLIC_SUPABASE_URL**
   - Your Supabase project URL

5. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Your Supabase anon key

### 4. Verify Deployment

After pushing to `main` or `master`:
- GitHub Actions will run automatically
- Check Actions tab in GitHub to see build status
- Vercel will deploy automatically

## Environment Variables

### Required for Production

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

## Troubleshooting

### Build Fails

1. Check GitHub Actions logs
2. Verify all environment variables are set
3. Ensure Supabase migrations are run

### Deployment Not Triggering

1. Verify branch name is `main` or `master`
2. Check `.github/workflows/deploy.yml` exists
3. Verify GitHub secrets are set correctly

### Vercel Deployment Issues

1. Check Vercel dashboard for error logs
2. Verify `vercel.json` configuration
3. Ensure build command works locally: `npm run build`

## Manual Deployment

If CI/CD is not working, you can deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Monitoring

- **Vercel Dashboard**: View deployments, logs, and analytics
- **GitHub Actions**: Monitor CI/CD pipeline
- **Supabase Dashboard**: Monitor database usage

## Rollback

To rollback to a previous deployment:

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments"
4. Find the deployment you want
5. Click "..." → "Promote to Production"


