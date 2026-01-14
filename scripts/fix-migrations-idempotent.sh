#!/bin/bash

# Script to make all migration files idempotent
# Adds IF NOT EXISTS to CREATE TABLE and CREATE INDEX
# Adds DROP IF EXISTS before CREATE POLICY and CREATE TRIGGER

echo "Making all migration files idempotent..."

MIGRATION_DIR="supabase/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo "Error: $MIGRATION_DIR directory not found"
  exit 1
fi

for migration_file in "$MIGRATION_DIR"/*.sql; do
  if [ ! -f "$migration_file" ]; then
    continue
  fi

  echo "Processing: $(basename "$migration_file")"

  # Create temporary file
  temp_file="${migration_file}.tmp"

  # Process the file
  cat "$migration_file" | \
    # Add IF NOT EXISTS to CREATE TABLE (but not CREATE TABLE IF NOT EXISTS)
    sed -E 's/^CREATE TABLE ([^(]+)\(/CREATE TABLE IF NOT EXISTS \1(/g' | \
    # Add IF NOT EXISTS to CREATE INDEX (but not CREATE INDEX IF NOT EXISTS)
    sed -E 's/^CREATE INDEX ([^ ]+)/CREATE INDEX IF NOT EXISTS \1/g' | \
    # Add DROP POLICY IF EXISTS before CREATE POLICY
    awk '
      /^CREATE POLICY/ {
        # Extract policy name and table name
        if (match($0, /"([^"]+)" ON ([^ ]+)/, arr)) {
          policy_name = arr[1]
          table_name = arr[2]
          print "DROP POLICY IF EXISTS \"" policy_name "\" ON " table_name ";"
        }
      }
      { print }
    ' | \
    # Add DROP TRIGGER IF EXISTS before CREATE TRIGGER
    awk '
      /^CREATE TRIGGER/ {
        # Extract trigger name
        trigger_name = $3
        # Find the ON table_name in next lines
        getline
        while ($0 !~ /ON [a-z_]+/ && NR < 1000) {
          prev_line = prev_line "\n" $0
          getline
        }
        if (match($0, /ON ([a-z_]+)/, arr)) {
          table_name = arr[1]
          print "DROP TRIGGER IF EXISTS " trigger_name " ON " table_name ";"
          print prev_line
        }
        prev_line = ""
      }
      { print }
    ' > "$temp_file"

  # Use a simpler approach - process line by line
  python3 << 'PYTHON_SCRIPT'
import sys
import re

def process_migration(input_file, output_file):
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    output = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # CREATE TABLE -> CREATE TABLE IF NOT EXISTS
        if re.match(r'^\s*CREATE TABLE\s+[^(]+\s*\(', line, re.IGNORECASE):
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.IGNORECASE)
        
        # CREATE INDEX -> CREATE INDEX IF NOT EXISTS
        elif re.match(r'^\s*CREATE INDEX\s+', line, re.IGNORECASE) and 'IF NOT EXISTS' not in line.upper():
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.IGNORECASE)
        
        # CREATE POLICY -> Add DROP POLICY IF EXISTS before
        elif re.match(r'^\s*CREATE POLICY\s+"', line, re.IGNORECASE):
            match = re.search(r'CREATE POLICY\s+"([^"]+)"\s+ON\s+([^\s]+)', line, re.IGNORECASE)
            if match:
                policy_name = match.group(1)
                table_name = match.group(2)
                output.append(f'DROP POLICY IF EXISTS "{policy_name}" ON {table_name};\n')
        
        # CREATE TRIGGER -> Add DROP TRIGGER IF EXISTS before
        elif re.match(r'^\s*CREATE TRIGGER\s+', line, re.IGNORECASE):
            match = re.search(r'CREATE TRIGGER\s+([^\s]+)', line, re.IGNORECASE)
            if match:
                trigger_name = match.group(1)
                # Look ahead for ON table_name
                table_name = None
                for j in range(i, min(i+5, len(lines))):
                    on_match = re.search(r'ON\s+([^\s]+)', lines[j], re.IGNORECASE)
                    if on_match:
                        table_name = on_match.group(1)
                        break
                if table_name:
                    output.append(f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};\n')
        
        output.append(line)
        i += 1
    
    with open(output_file, 'w') as f:
        f.writelines(output)

if __name__ == '__main__':
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    process_migration(input_file, output_file)
PYTHON_SCRIPT

  # Use Python script instead
  python3 -c "
import sys
import re

def process_file(input_file, output_file):
    with open(input_file, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    output = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        original_line = line
        
        # CREATE TABLE -> CREATE TABLE IF NOT EXISTS
        if re.match(r'^\s*CREATE TABLE\s+[^(]+\s*\(', line, re.IGNORECASE) and 'IF NOT EXISTS' not in line.upper():
            line = re.sub(r'CREATE TABLE\s+', 'CREATE TABLE IF NOT EXISTS ', line, flags=re.IGNORECASE)
        
        # CREATE INDEX -> CREATE INDEX IF NOT EXISTS  
        elif re.match(r'^\s*CREATE INDEX\s+', line, re.IGNORECASE) and 'IF NOT EXISTS' not in line.upper():
            line = re.sub(r'CREATE INDEX\s+', 'CREATE INDEX IF NOT EXISTS ', line, flags=re.IGNORECASE)
        
        # CREATE POLICY -> Add DROP POLICY IF EXISTS before
        elif re.match(r'^\s*CREATE POLICY\s+', line, re.IGNORECASE):
            match = re.search(r'CREATE POLICY\s+\"([^\"]+)\"\s+ON\s+([^\s]+)', line, re.IGNORECASE)
            if match:
                policy_name = match.group(1)
                table_name = match.group(2)
                output.append(f'DROP POLICY IF EXISTS \"{policy_name}\" ON {table_name};')
        
        # CREATE TRIGGER -> Add DROP TRIGGER IF EXISTS before
        elif re.match(r'^\s*CREATE TRIGGER\s+', line, re.IGNORECASE):
            match = re.search(r'CREATE TRIGGER\s+([^\s]+)', line, re.IGNORECASE)
            if match:
                trigger_name = match.group(1)
                # Look ahead for ON table_name (next 5 lines)
                table_name = None
                for j in range(i, min(i+5, len(lines))):
                    on_match = re.search(r'ON\s+([^\s,;]+)', lines[j], re.IGNORECASE)
                    if on_match:
                        table_name = on_match.group(1)
                        break
                if table_name:
                    output.append(f'DROP TRIGGER IF EXISTS {trigger_name} ON {table_name};')
        
        output.append(line)
        i += 1
    
    with open(output_file, 'w') as f:
        f.write('\n'.join(output))

process_file('$migration_file', '$temp_file')
"

  # Replace original with processed file
  mv "$temp_file" "$migration_file"
  echo "  ✓ Fixed $(basename "$migration_file")"
done

echo ""
echo "✅ All migration files updated!"
