import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace('BrowserRouter', 'HashRouter')
content = content.replace('basename={import.meta.env.BASE_URL}', '')

with open('src/App.tsx', 'w') as f:
    f.write(content)
