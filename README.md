# Workflow Builder

A visual workflow builder for creating AI-powered automation workflows using multiple AI providers.

## Features

- 🎨 Visual drag-and-drop workflow builder
- 🤖 Multiple AI providers (OpenAI, Gemini, ElevenLabs, Stable Diffusion, Supadata)
- 🔗 Chain multiple AI operations
- 💾 Save and load workflows
- 🎯 Context templates for reusable prompts
- 🔊 Text-to-speech with ElevenLabs
- 🖼️ Image generation support

## Tech Stack

- **Framework**: Next.js 16
- **UI**: React 19, Tailwind CSS
- **State Management**: Zustand
- **Workflow Engine**: React Flow (@xyflow/react)
- **Database**: Supabase
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Supabase account (for data persistence)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd workflow-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase database:
   - Run the migration in `supabase_migrations/create_contexts_table.sql` in your Supabase SQL editor

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. **Connect to Vercel**:
   - Push your code to GitHub
   - Import your repository in Vercel
   - Add environment variables in Vercel dashboard

2. **Environment Variables** (set in Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Automatic Deployments**:
   - Pushes to `master` branch automatically deploy to production
   - Pull requests create preview deployments

### Manual Deployment

```bash
npm run build
npm start
```

## CI/CD

This project uses GitHub Actions for CI/CD. On every push to `master`:
- Runs linter
- Builds the project
- Deploys to Vercel

### Required GitHub Secrets

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

## Project Structure

```
workflow-app/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/        # React components
│   │   ├── nodes/        # Workflow node components
│   │   └── ui/           # UI components
│   ├── lib/              # Utility functions
│   ├── store/            # Zustand stores
│   ├── context/          # React contexts
│   └── hooks/            # Custom React hooks
├── supabase_migrations/  # Database migrations
└── public/               # Static assets
```

## Performance Optimizations

- ✅ React.memo for component memoization
- ✅ useMemo and useCallback for expensive operations
- ✅ Proper cleanup in useEffect hooks
- ✅ AbortController for fetch requests
- ✅ Code splitting with dynamic imports
- ✅ Image optimization with Next.js Image component

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
