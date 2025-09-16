#!/usr/bin/env python3
"""
Test Runner for Group Study Idle App Backend
Runs all available tests in the tests directory.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Run all test files in the tests directory."""
    
    print("🧪 Group Study Idle App Backend - Test Runner")
    print("=" * 50)
    
    # Get the tests directory
    tests_dir = Path(__file__).parent
    backend_dir = tests_dir.parent
    
    # Add backend to Python path
    sys.path.insert(0, str(backend_dir))
    
    # Find all test files
    test_files = []
    
    # Python test files
    for test_file in tests_dir.glob("test_*.py"):
        if test_file.name != "run_all_tests.py":
            test_files.append(test_file)
    
    print(f"Found {len(test_files)} test files:")
    for test_file in sorted(test_files):
        print(f"  - {test_file.name}")
    
    print("\n" + "=" * 50)
    
    # Run each test file
    results = {}
    
    for test_file in sorted(test_files):
        print(f"\n🔬 Running {test_file.name}...")
        print("-" * 30)
        
        try:
            # Change to tests directory and run the test
            result = subprocess.run(
                [sys.executable, test_file.name],
                cwd=tests_dir,
                capture_output=False,  # Show output in real time
                text=True
            )
            
            if result.returncode == 0:
                results[test_file.name] = "✅ PASSED"
                print(f"✅ {test_file.name} PASSED")
            else:
                results[test_file.name] = "❌ FAILED"
                print(f"❌ {test_file.name} FAILED (exit code: {result.returncode})")
                
        except Exception as e:
            results[test_file.name] = f"❌ ERROR: {e}"
            print(f"❌ {test_file.name} ERROR: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        print(f"{result} - {test_name}")
        if "PASSED" in result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📈 Total: {len(results)} tests")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())