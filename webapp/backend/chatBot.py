import dotenv
import os
import google.generativeai as genai

dotenv.load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content("Explain how AI works")


print(response.text)