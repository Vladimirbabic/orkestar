'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  ArrowLeft,
  Search,
  Zap,
  Megaphone,
  TrendingUp,
  Headphones,
  CheckSquare,
  Code,
  Crown,
  Grid,
  Sparkles,
  Users,
  Lock,
} from 'lucide-react';
import { Template } from '@/lib/templateService';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Grid },
  { id: 'starter', name: 'Starter', icon: Zap },
  { id: 'marketing', name: 'Marketing', icon: Megaphone },
  { id: 'sales', name: 'Sales', icon: TrendingUp },
  { id: 'support', name: 'Support', icon: Headphones },
  { id: 'productivity', name: 'Productivity', icon: CheckSquare },
  { id: 'developer', name: 'Developer', icon: Code },
  { id: 'premium', name: 'Premium', icon: Crown },
];

export default function TemplatesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { status, isPro } = useSubscription();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const tier = isPro() ? 'pro' : 'free';
        const res = await fetch(`/api/templates?tier=${tier}&category=${selectedCategory}`);
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchTemplates();
    }
  }, [isAuthenticated, selectedCategory, isPro]);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseTemplate = (template: Template) => {
    // Store template in sessionStorage and redirect to new workflow
    sessionStorage.setItem('template', JSON.stringify(template));
    router.push('/workflows/new?template=true');
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Workflows</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Template Library
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Start faster with templates
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Pre-built workflows to help you automate common tasks. Click to use any template as a starting point.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-violet-500 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-zinc-500">Loading templates...</div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Grid className="w-7 h-7 text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-zinc-200 mb-2">No templates found</h3>
            <p className="text-zinc-500">
              {searchQuery
                ? 'Try a different search term'
                : 'Templates will appear here once added'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const isLocked = template.tier !== 'free' && !isPro();
              return (
                <div
                  key={template.id}
                  className={`group relative bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden transition-all ${
                    isLocked
                      ? 'opacity-75'
                      : 'hover:border-zinc-700 hover:shadow-lg hover:shadow-violet-500/5'
                  }`}
                >
                  {/* Template Preview */}
                  <div className="aspect-video bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-center">
                    <div className="text-4xl opacity-50">
                      {template.category === 'starter' && <Zap className="w-10 h-10 text-yellow-500" />}
                      {template.category === 'marketing' && <Megaphone className="w-10 h-10 text-pink-500" />}
                      {template.category === 'sales' && <TrendingUp className="w-10 h-10 text-green-500" />}
                      {template.category === 'support' && <Headphones className="w-10 h-10 text-blue-500" />}
                      {template.category === 'productivity' && <CheckSquare className="w-10 h-10 text-orange-500" />}
                      {template.category === 'developer' && <Code className="w-10 h-10 text-cyan-500" />}
                      {template.category === 'premium' && <Crown className="w-10 h-10 text-violet-500" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                        {template.name}
                      </h3>
                      {template.tier !== 'free' && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{template.usage_count} uses</span>
                      </div>
                      {isLocked ? (
                        <button
                          onClick={() => router.push('/pricing')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Upgrade
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUseTemplate(template)}
                          className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-colors"
                        >
                          Use Template
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Featured badge */}
                  {template.is_featured && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      <span className="text-[10px] font-medium text-yellow-500">Featured</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pro CTA for free users */}
        {!isPro() && (
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center">
            <Crown className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Unlock all templates with Pro
            </h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Get access to premium templates, community submissions, and exclusive agent templates.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 rounded-lg bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


