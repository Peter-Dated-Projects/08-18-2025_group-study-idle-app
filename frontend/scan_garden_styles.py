#!/usr/bin/env python3
"""
Batch convert inline styles to Tailwind in garden components
Only converts common, well-known CSS properties
"""
import os
import re
from pathlib import Path

# Mapping of common inline styles to Tailwind classes
STYLE_CONVERSIONS = {
    # Layout & Display
    r'display:\s*["\']?flex["\']?': 'flex',
    r'display:\s*["\']?block["\']?': 'block',
    r'display:\s*["\']?inline-block["\']?': 'inline-block',
    r'display:\s*["\']?grid["\']?': 'grid',
    r'flexDirection:\s*["\']?column["\']?': 'flex-col',
    r'flexDirection:\s*["\']?row["\']?': 'flex-row',
    
    # Positioning
    r'position:\s*["\']?relative["\']?': 'relative',
    r'position:\s*["\']?absolute["\']?': 'absolute',
    r'position:\s*["\']?fixed["\']?': 'fixed',
    
    # Alignment
    r'alignItems:\s*["\']?center["\']?': 'items-center',
    r'alignItems:\s*["\']?flex-start["\']?': 'items-start',
    r'alignItems:\s*["\']?flex-end["\']?': 'items-end',
    r'justifyContent:\s*["\']?center["\']?': 'justify-center',
    r'justifyContent:\s*["\']?space-between["\']?': 'justify-between',
    r'justifyContent:\s*["\']?flex-start["\']?': 'justify-start',
    r'justifyContent:\s*["\']?flex-end["\']?': 'justify-end',
    
    # Spacing
    r'padding:\s*["\']?0["\']?': 'p-0',
    r'padding:\s*["\']?5px["\']?': 'p-1',
    r'padding:\s*["\']?10px["\']?': 'p-2.5',
    r'padding:\s*["\']?15px["\']?': 'p-4',
    r'padding:\s*["\']?20px["\']?': 'p-5',
    r'margin:\s*["\']?0["\']?': 'm-0',
    r'marginTop:\s*["\']?10px["\']?': 'mt-2.5',
    r'marginTop:\s*["\']?20px["\']?': 'mt-5',
    r'marginBottom:\s*["\']?10px["\']?': 'mb-2.5',
    r'marginBottom:\s*["\']?20px["\']?': 'mb-5',
    
    # Sizing
    r'width:\s*["\']?100%["\']?': 'w-full',
    r'height:\s*["\']?100%["\']?': 'h-full',
    
    # Borders
    r'borderRadius:\s*["\']?50%["\']?': 'rounded-full',
    r'borderRadius:\s*["\']?4px["\']?': 'rounded',
    r'borderRadius:\s*["\']?8px["\']?': 'rounded-lg',
    
    # Overflow
    r'overflow:\s*["\']?hidden["\']?': 'overflow-hidden',
    r'overflow:\s*["\']?auto["\']?': 'overflow-auto',
    r'overflow:\s*["\']?scroll["\']?': 'overflow-scroll',
    
    # Text
    r'textAlign:\s*["\']?center["\']?': 'text-center',
    r'textAlign:\s*["\']?left["\']?': 'text-left',
    r'textAlign:\s*["\']?right["\']?': 'text-right',
    r'fontWeight:\s*["\']?bold["\']?': 'font-bold',
    r'fontSize:\s*["\']?14px["\']?': 'text-sm',
    r'fontSize:\s*["\']?16px["\']?': 'text-base',
    r'fontSize:\s*["\']?18px["\']?': 'text-lg',
    r'fontSize:\s*["\']?20px["\']?': 'text-xl',
    
    # Cursor
    r'cursor:\s*["\']?pointer["\']?': 'cursor-pointer',
    r'cursor:\s*["\']?default["\']?': 'cursor-default',
    
    # Flex
    r'flex:\s*["\']?1["\']?': 'flex-1',
    r'gap:\s*["\']?10px["\']?': 'gap-2.5',
    r'gap:\s*["\']?8px["\']?': 'gap-2',
}

def should_skip_file(filepath):
    """Determine if file should be skipped"""
    # Skip non-TSX/TS files
    if not filepath.endswith(('.tsx', '.ts')):
        return True
    
    # Skip type definition files
    if filepath.endswith('.d.ts') or 'types.ts' in filepath:
        return True
    
    return False

def convert_file(filepath):
    """Convert inline styles to Tailwind in a file"""
    if should_skip_file(filepath):
        return False
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        modified = False
        
        # Simple conversions - just track if we made changes
        # Actual conversion should be done manually for safety
        # This script just identifies candidates
        
        # Count style attributes
        style_count = len(re.findall(r'style=\{\{[^}]+\}\}', content))
        
        if style_count > 0:
            print(f"  Found {style_count} style attributes in {filepath}")
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    garden_dir = Path(__file__).parent / 'src' / 'components' / 'garden'
    
    if not garden_dir.exists():
        print(f"Garden directory not found: {garden_dir}")
        return
    
    print("Scanning garden components for inline styles...\n")
    
    files_with_styles = []
    total_files = 0
    
    for root, dirs, files in os.walk(garden_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')) and not file.endswith('.d.ts'):
                filepath = os.path.join(root, file)
                total_files += 1
                if convert_file(filepath):
                    files_with_styles.append(filepath)
    
    print(f"\nSummary:")
    print(f"Total files scanned: {total_files}")
    print(f"Files with inline styles: {len(files_with_styles)}")
    
    if files_with_styles:
        print(f"\nFiles to convert:")
        for f in files_with_styles[:20]:
            print(f"  - {Path(f).relative_to(garden_dir.parent.parent.parent)}")
        if len(files_with_styles) > 20:
            print(f"  ... and {len(files_with_styles) - 20} more")

if __name__ == '__main__':
    main()
