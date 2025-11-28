'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Mail, 
  Send,
  ChevronDown,
  Settings2,
  ExternalLink,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  SlackLogo,
  NotionLogo,
  GoogleSheetsLogo,
  DiscordLogo,
  AirtableLogo,
} from '@/components/icons/BrandLogos';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAuth } from '@/context/AuthContext';

export type IntegrationType = 'email' | 'google-sheets' | 'slack' | 'notion' | 'discord' | 'airtable';

export interface IntegrationNodeData {
  label: string;
  integrationType: IntegrationType;
  action: string;
  config: Record<string, unknown>;
  isConnected?: boolean;
  accountName?: string;
  accountEmail?: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  channelId?: string;
  channelName?: string;
  pageId?: string;
  pageName?: string;
  [key: string]: unknown;
}

// Map integration type to OAuth provider
const INTEGRATION_TO_PROVIDER: Record<IntegrationType, string | null> = {
  'email': null,
  'google-sheets': 'google',
  'slack': 'slack',
  'notion': 'notion',
  'discord': null, // Not implemented yet
  'airtable': null, // Not implemented yet
};

// Custom icon wrapper to match LucideIcon interface
const MailIcon = ({ className }: { className?: string }) => <Mail className={className} />;

const INTEGRATION_CONFIG: Record<IntegrationType, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  connectColor: string;
  actions: { value: string; label: string }[];
  tier: 'free' | 'pro';
  useBrandLogo?: boolean;
  connectLabel: string;
}> = {
  'email': {
    name: 'Email',
    icon: MailIcon,
    color: 'from-rose-500 to-pink-500',
    connectColor: 'bg-rose-500 hover:bg-rose-600',
    actions: [
      { value: 'send', label: 'Send Email' },
    ],
    tier: 'free',
    connectLabel: 'Configure Email',
  },
  'google-sheets': {
    name: 'Google Sheets',
    icon: GoogleSheetsLogo,
    color: 'from-green-500 to-emerald-500',
    connectColor: 'bg-[#34A853] hover:bg-[#2d9249]',
    actions: [
      { value: 'read', label: 'Read Row' },
      { value: 'append', label: 'Append Row' },
      { value: 'update', label: 'Update Row' },
    ],
    tier: 'pro',
    useBrandLogo: true,
    connectLabel: 'Connect Google Account',
  },
  'slack': {
    name: 'Slack',
    icon: SlackLogo,
    color: 'from-purple-500 to-violet-500',
    connectColor: 'bg-[#4A154B] hover:bg-[#611f69]',
    actions: [
      { value: 'send_message', label: 'Send Message' },
      { value: 'send_dm', label: 'Send DM' },
    ],
    tier: 'pro',
    useBrandLogo: true,
    connectLabel: 'Connect to Slack',
  },
  'notion': {
    name: 'Notion',
    icon: NotionLogo,
    color: 'from-zinc-600 to-zinc-700',
    connectColor: 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600',
    actions: [
      { value: 'create_page', label: 'Create Page' },
      { value: 'update_page', label: 'Update Page' },
      { value: 'add_to_database', label: 'Add to Database' },
    ],
    tier: 'pro',
    useBrandLogo: true,
    connectLabel: 'Connect to Notion',
  },
  'discord': {
    name: 'Discord',
    icon: DiscordLogo,
    color: 'from-indigo-500 to-blue-500',
    connectColor: 'bg-[#5865F2] hover:bg-[#4752c4]',
    actions: [
      { value: 'send_message', label: 'Send Message' },
      { value: 'create_thread', label: 'Create Thread' },
    ],
    tier: 'pro',
    useBrandLogo: true,
    connectLabel: 'Connect to Discord',
  },
  'airtable': {
    name: 'Airtable',
    icon: AirtableLogo,
    color: 'from-yellow-500 to-orange-500',
    connectColor: 'bg-[#18BFFF] hover:bg-[#14a8e0]',
    actions: [
      { value: 'create_record', label: 'Create Record' },
      { value: 'update_record', label: 'Update Record' },
      { value: 'find_record', label: 'Find Record' },
    ],
    tier: 'pro',
    useBrandLogo: true,
    connectLabel: 'Connect to Airtable',
  },
};

function IntegrationNode({ data, selected, id }: NodeProps) {
  const nodeData = data as IntegrationNodeData;
  const config = INTEGRATION_CONFIG[nodeData.integrationType] || INTEGRATION_CONFIG['email'];
  const Icon = config.icon;
  const [showSettings, setShowSettings] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    providerEmail?: string | null;
    providerData?: Record<string, unknown> | null;
  }>({
    connected: nodeData.isConnected || false,
    providerEmail: nodeData.accountEmail,
  });

  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const { user } = useAuth();

  const provider = INTEGRATION_TO_PROVIDER[nodeData.integrationType];

  // Fetch integration status on mount
  useEffect(() => {
    if (!provider) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/integrations/status');
        if (response.ok) {
          const data = await response.json();
          const status = data.statuses?.[provider];
          if (status) {
            setConnectionStatus({
              connected: status.connected,
              providerEmail: status.providerEmail,
              providerData: status.providerData,
            });
            // Update node data with connection status
            if (status.connected !== nodeData.isConnected) {
              updateNodeData(id, {
                isConnected: status.connected,
                accountEmail: status.providerEmail,
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch integration status:', error);
      }
    };

    fetchStatus();

    // Check for OAuth callback success/error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('integration_success');
    const error = urlParams.get('integration_error');
    
    if (success === provider) {
      // Refresh status after successful connection
      fetchStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      console.error('OAuth error:', error);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [provider, id, nodeData.isConnected, updateNodeData]);

  const actionLabel = config.actions.find(a => a.value === nodeData.action)?.label || config.actions[0].label;

  const handleConnect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!provider) {
      alert(`${config.name} integration is coming soon!`);
      return;
    }

    if (!user) {
      alert('Please log in first to connect integrations.');
      return;
    }

    setIsConnecting(true);
    
    // Open OAuth flow - pass user ID via query param since server can't access localStorage session
    const authUrl = `/api/integrations/${provider}/authorize?userId=${encodeURIComponent(user.id)}`;
    window.location.href = authUrl;
  }, [provider, config.name, user]);

  const handleDisconnect = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!provider) return;
    
    setIsDisconnecting(true);
    
    try {
      const response = await fetch('/api/integrations/status', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });
      
      if (response.ok) {
        setConnectionStatus({ connected: false });
        updateNodeData(id, {
          isConnected: false,
          accountEmail: undefined,
        });
      } else {
        console.error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setIsDisconnecting(false);
    }
  }, [provider, id, updateNodeData]);

  const isConnected = connectionStatus.connected;
  const accountEmail = connectionStatus.providerEmail;

  return (
    <div
      className={`relative min-w-[280px] rounded-xl border-2 overflow-visible transition-all duration-200 ${
        selected
          ? 'border-violet-500/70 shadow-xl shadow-violet-500/20 ring-2 ring-violet-500/30 ring-offset-2 ring-offset-zinc-950'
          : 'border-zinc-700/80 hover:border-zinc-500/80 hover:shadow-lg hover:shadow-zinc-800/30'
      } bg-zinc-900/95 backdrop-blur-sm`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-zinc-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800/50">
        <div className={`w-8 h-8 rounded-lg ${config.useBrandLogo ? 'bg-zinc-800' : `bg-gradient-to-br ${config.color}`} flex items-center justify-center shadow-lg`}>
          <Icon className={`w-4 h-4 ${config.useBrandLogo ? '' : 'text-white'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {nodeData.label || config.name}
          </h3>
          <p className="text-xs text-zinc-500">{actionLabel}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            showSettings ? 'bg-zinc-700 text-zinc-300' : 'hover:bg-zinc-800 text-zinc-500'
          }`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Connection Status & Connect Button */}
      <div className="p-3 border-b border-zinc-800/50">
        {isConnected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-emerald-400">Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
                Disconnect
              </button>
            </div>
            {accountEmail && (
              <p className="text-xs text-zinc-400 truncate">{accountEmail}</p>
            )}
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting || !provider}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white transition-all ${config.connectColor} disabled:opacity-50`}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            {isConnecting ? 'Connecting...' : config.connectLabel}
            {!isConnecting && <ExternalLink className="w-3 h-3 opacity-70" />}
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-3 border-b border-zinc-800/50 bg-zinc-950/50 space-y-3">
          {/* Action Selector */}
          <div>
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
              Action
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowActionDropdown(!showActionDropdown);
                }}
                className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                <span>{actionLabel}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showActionDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showActionDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  {config.actions.map((action) => (
                    <button
                      key={action.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNodeData(id, { action: action.value });
                        setShowActionDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-zinc-700 transition-colors ${
                        nodeData.action === action.value ? 'bg-zinc-700/50 text-white' : 'text-zinc-300'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Integration-specific fields */}
          {nodeData.integrationType === 'google-sheets' && isConnected && (
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                Spreadsheet
              </label>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 transition-colors"
              >
                <span>{nodeData.spreadsheetName || 'Select spreadsheet...'}</span>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          )}

          {nodeData.integrationType === 'slack' && isConnected && (
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                Channel
              </label>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 transition-colors"
              >
                <span>{nodeData.channelName || 'Select channel...'}</span>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          )}

          {nodeData.integrationType === 'notion' && isConnected && (
            <div>
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
                Page / Database
              </label>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 transition-colors"
              >
                <span>{nodeData.pageName || 'Select page...'}</span>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Preview */}
      <div className="p-3">
        <div className="flex items-center gap-2 px-2.5 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
          <Send className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-400">
            {nodeData.integrationType === 'email' && 'Send to {{email}}'}
            {nodeData.integrationType === 'google-sheets' && (nodeData.spreadsheetName || 'Connect to select sheet')}
            {nodeData.integrationType === 'slack' && (nodeData.channelName || 'Connect to select channel')}
            {nodeData.integrationType === 'notion' && (nodeData.pageName || 'Connect to select page')}
            {nodeData.integrationType === 'discord' && 'Channel: {{channel_id}}'}
            {nodeData.integrationType === 'airtable' && 'Base: {{base_id}}'}
          </span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-zinc-500 !border-2 !border-zinc-900 !z-50 hover:!scale-125 !transition-transform"
      />

      {/* Pro badge for pro integrations */}
      {config.tier === 'pro' && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[10px] font-semibold text-white shadow-lg">
          PRO
        </div>
      )}
    </div>
  );
}

export default memo(IntegrationNode);

export { INTEGRATION_CONFIG };
