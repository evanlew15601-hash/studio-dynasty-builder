import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { MarkdownLite } from '@/components/MarkdownLite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import helpContent from '@/content/help.md?raw';
import thirdPartyNotices from '@/content/THIRD_PARTY_NOTICES.md?raw';

const Help = () => {
  const repoUrl = (() => {
    if (typeof window === 'undefined') return null;

    const host = window.location.hostname;
    if (!host.endsWith('.github.io')) return null;

    const owner = host.replace(/\.github\.io$/i, '');
    const pathParts = window.location.pathname.split('/').filter(Boolean);

    // If deployed to https://<owner>.github.io/<repo>/ then the first path segment is the repo.
    // If deployed to https://<owner>.github.io/ then it is a user site, repo is <owner>.github.io.
    const repo = pathParts.length > 0 ? pathParts[0] : `${owner}.github.io`;

    return `https://github.com/${owner}/${repo}`;
  })();

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Help</h1>
            <p className="text-sm text-muted-foreground">Game basics, tips, and open source notices.</p>
          </div>

          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              Back
            </Link>
          </Button>
        </div>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="how-to" className="w-full">
              <TabsList>
                <TabsTrigger value="how-to">How to play</TabsTrigger>
                <TabsTrigger value="open-source">Open source</TabsTrigger>
              </TabsList>

              <TabsContent value="how-to">
                <ScrollArea className="h-[70vh] rounded-md border border-border bg-background p-6">
                  <MarkdownLite
                    content={helpContent}
                    className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80"
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="open-source">
                <ScrollArea className="h-[70vh] rounded-md border border-border bg-background p-6">
                  {repoUrl ? (
                    <p className="mb-4 text-sm text-muted-foreground">
                      Source code:{' '}
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:text-primary/80 underline underline-offset-4"
                      >
                        {repoUrl}
                      </a>
                    </p>
                  ) : null}

                  <MarkdownLite
                    content={thirdPartyNotices}
                    className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80"
                  />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
