import os

# Read the file
with open('src/app/(customer)/search/page.tsx', 'r') as f:
    content = f.read()

# Remove the trailing ''' at the end of the file
if content.endswith("'''\n"):
    content = content[:-4]
elif content.endswith("'''"):
    content = content[:-3]

# Write the cleaned content
with open('src/app/(customer)/search/page.tsx', 'w') as f:
    f.write(content)

print('Cleaned search page')
