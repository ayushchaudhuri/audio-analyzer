import os
import numpy as np
from scipy.io import wavfile
import requests
from pathlib import Path

def generate_test_audio():
    # Create test directory if it doesn't exist
    test_dir = Path("test_files")
    test_dir.mkdir(exist_ok=True)
    
    # Generate a simple sine wave
    sample_rate = 44100
    duration = 3  # seconds
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a 440 Hz sine wave (A4 note)
    frequency = 440
    audio_data = np.sin(2 * np.pi * frequency * t)
    
    # Add some harmonics to make it more interesting
    audio_data += 0.5 * np.sin(2 * np.pi * frequency * 2 * t)  # First harmonic
    audio_data += 0.25 * np.sin(2 * np.pi * frequency * 3 * t)  # Second harmonic
    
    # Normalize
    audio_data = np.int16(audio_data * 32767)
    
    # Save as WAV file
    output_file = test_dir / "test_tone.wav"
    wavfile.write(output_file, sample_rate, audio_data)
    
    return output_file

def test_audio_analysis():
    # Generate test audio file
    test_file = generate_test_audio()
    print(f"Generated test file: {test_file}")
    
    # Send file to backend
    url = "http://localhost:8000/analyze"
    
    try:
        with open(test_file, "rb") as f:
            files = {"file": ("test_tone.wav", f, "audio/wav")}
            response = requests.post(url, files=files)
            
        if response.status_code == 200:
            print("Analysis successful!")
            print("Results:", response.json())
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the backend server. Make sure it's running on http://localhost:8000")

if __name__ == "__main__":
    test_audio_analysis() 