#!/usr/bin/env python3
import sys
import os
from pathlib import Path

def test_imports():
    """Test all required imports for the backend."""
    print("Testing imports...")
    
    try:
        import fastapi
        print("✓ FastAPI imported successfully")
        
        import librosa
        print("✓ Librosa imported successfully")
        
        import numpy
        print("✓ NumPy imported successfully")
        
        import mutagen
        print("✓ Mutagen imported successfully")
        
        import soundfile
        print("✓ SoundFile imported successfully")
        
    except ImportError as e:
        print(f"❌ Import Error: {str(e)}")
        sys.exit(1)

def test_main_module():
    """Test importing and initializing the main FastAPI application."""
    print("\nTesting main module...")
    
    try:
        import main
        print("✓ Main module imported successfully")
        
        assert hasattr(main, 'app'), "Main module missing 'app' FastAPI instance"
        print("✓ FastAPI app instance found")
        
        assert hasattr(main, 'analyze_audio'), "Main module missing 'analyze_audio' endpoint"
        print("✓ Analyze audio endpoint found")
        
    except Exception as e:
        print(f"❌ Main Module Error: {str(e)}")
        sys.exit(1)

def main():
    """Run all tests."""
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path}\n")
    
    test_imports()
    test_main_module()
    
    print("\n✨ All tests passed successfully!")

if __name__ == "__main__":
    main() 