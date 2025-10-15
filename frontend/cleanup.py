#!/usr/bin/env python3
"""
Frontend cleanup script:
1. Remove unused imports (via ESLint)
2. Remove console.log/debug/info statements  
3. Clean up excessive comments
"""
import os
import re
import subprocess
from pathlib import Path

def remove_debug_console_statements(content):
    """Remove console.log, console.debug, console.info but keep console.error and console.warn"""
    # Pattern to match complete console.log/debug/info statements
    # Handles single and multi-line calls
    patterns = [
        # Single line console statements
        r'^\s*console\.(log|debug|info)\([^;]*\);\s*$',
        # Console statements that span multiple lines - match until we find closing )
        r'console\.(log|debug|info)\s*\(\s*[^)]*\s*\)\s*;?',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def remove_redundant_comments(content):
    """Remove obvious redundant or placeholder comments"""
    patterns = [
        # Single-line comments that are just markers
        r'^\s*//\s*(TODO|FIXME|HACK|XXX):\s*$',
        # Comments describing the next line of code obviously
        r'^\s*//\s*Profile picture.*\n\s*<CachedProfilePicture',
        r'^\s*//\s*Profile Content.*\n',
        r'^\s*//\s*User Information.*\n',
        r'^\s*//\s*Edit Profile Button.*\n',
        r'^\s*//\s*Hover Overlay.*\n',
        r'^\s*//\s*(Premium|Free) Banner.*\n',
        # Empty comment blocks
        r'^\s*//\s*$',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    return content

def clean_empty_lines(content):
    """Reduce excessive empty lines"""
    # Replace 3+ consecutive newlines with just 2
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content

def process_file(file_path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply transformations
        content = remove_debug_console_statements(content)
        content = remove_redundant_comments(content)
        content = clean_empty_lines(content)
        
        # Only write if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    src_dir = Path(__file__).parent / 'src'
    
    if not src_dir.exists():
        print(f"Error: {src_dir} does not exist")
        return
    
    print("Step 1: Running ESLint auto-fix to remove unused imports...")
    try:
        subprocess.run(['npx', 'eslint', '--fix', 'src/**/*.{ts,tsx,js,jsx}', '--quiet'], 
                      capture_output=True, text=True)
        print("✓ ESLint auto-fix completed")
    except Exception as e:
        print(f"ESLint warning: {e}")
    
    print("\nStep 2: Cleaning console statements and comments...")
    
    extensions = ('.ts', '.tsx', '.js', '.jsx')
    modified_files = []
    
    for file_path in src_dir.rglob('*'):
        if file_path.is_file() and file_path.suffix in extensions:
            # Skip certain directories
            if any(skip in file_path.parts for skip in ['node_modules', '.next', 'dist', 'build']):
                continue
            
            if process_file(file_path):
                modified_files.append(file_path.relative_to(src_dir))
    
    print(f"\n✓ Cleaned {len(modified_files)} files")
    if modified_files:
        print("\nModified files:")
        for f in modified_files[:20]:
            print(f"  - {f}")
        if len(modified_files) > 20:
            print(f"  ... and {len(modified_files) - 20} more")
    
    print("\nStep 3: Running final ESLint check...")
    result = subprocess.run(['npx', 'eslint', 'src/**/*.{ts,tsx}', '--quiet'], 
                           capture_output=True, text=True)
    if result.stdout:
        print("Remaining issues:")
        print(result.stdout[:1000])
    else:
        print("✓ No critical issues found")

if __name__ == '__main__':
    main()
