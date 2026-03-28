import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clipboard, Copy, Download, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import onlineLeagueSetupSql from '@/content/online_league_setup.sql?raw';
import { Badge } from '@/components/ui/badge';

export function OnlineLeagueSQLDialog(props: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast({
        title: 'Clipboard unavailable',
        description: 'Copy manually or download the SQL file.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(onlineLeagueSetupSql);
      setCopied(true);
      toast({
        title: 'Copied to clipboard!',
        description: 'Paste into Supabase SQL Editor → New Query and run once.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please copy manually or download.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([onlineLeagueSetupSql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'online-league-schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded SQL schema',
      description: 'Save as online-league-schema.sql and import into Supabase.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Online League SQL Schema
          </DialogTitle>
          <DialogDescription>
            Run this SQL **once** in your Supabase project&apos;s SQL Editor (New Query).
            <br />
            <Badge variant="secondary" className="mt-1">Required for league tables/functions</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">
              Schema size: {(onlineLeagueSetupSql.length / 1000).toFixed(1)} KB
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Clipboard className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy SQL'}
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download .sql
              </Button>
            </div>
          </div>
          <Textarea
            readOnly
            value={onlineLeagueSetupSql}
            className="flex-1 font-mono text-xs bg-muted/50 resize-none border-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 p-3 min-h-[400px] rounded-lg"
            placeholder="SQL schema will appear here..."
          />
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

