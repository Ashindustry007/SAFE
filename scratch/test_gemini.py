import os
import requests
import json

api_key = "AIzaSyCi_Yz95TC5ABWnj4dV92oQ7Fu3UvQgUtc"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

headers = {
    "Content-Type": "application/json"
}

data = {
    "contents": [{
        "parts": [{
            "text": "Hello, are you working?"
        }]
    }]
}

try:
    response = requests.post(url, headers=headers, data=json.dumps(data))
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
