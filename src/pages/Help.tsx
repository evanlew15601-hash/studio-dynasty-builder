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
