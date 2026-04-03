const fs = require('fs');
const file = 'src/components/game/OnlineLeague.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const \[leagueBusy, setLeagueBusy\] = useState\(false\);/g,
  `const [leagueBusy, setLeagueBusy] = useState(false);\n  const [supabaseConfigOpen, setSupabaseConfigOpen] = useState(false);`
);

content = content.replace(
  /              <SupabaseConfigDialog>\n                <Button size="sm" variant="outline" className="font-medium">\n                  ⚙️ Configure Supabase\n                <\/Button>\n              <\/SupabaseConfigDialog>/g,
  `              <Button size="sm" variant="outline" className="font-medium" onClick={() => setSupabaseConfigOpen(true)}>\n                ⚙️ Configure Supabase\n              </Button>\n              <SupabaseConfigDialog open={supabaseConfigOpen} onOpenChange={setSupabaseConfigOpen} />`
);

fs.writeFileSync(file, content);
