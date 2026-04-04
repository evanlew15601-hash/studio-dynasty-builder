import re
with open('src/components/ui/talent-portrait.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { cn } from '@/utils/modding';", "import { cn } from '@/lib/utils';")

with open('src/components/ui/talent-portrait.tsx', 'w') as f:
    f.write(content)
