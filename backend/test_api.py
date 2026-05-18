import requests


from dotenv import load_dotenv
import os

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
print(f"API key loaded: {api_key[:8]}...")  # only prints first 8 chars for safety

def search_books(query):
    response = requests.get(
        "https://openlibrary.org/search.json",
        params={"q": query, "limit": 3}
    )
    
    data = response.json()
    books = data["docs"]
    
    print(f"\nSearch results for: '{query}'")
    print("-" * 40)
    
    for book in books:
        title = book["title"]
        author = book.get("author_name", ["Unknown"])[0]
        year = book.get("first_publish_year", "N/A")
        print(f"Title:  {title}")
        print(f"Author: {author}")
        print(f"Year:   {year}")
        print()

search_books("machine learning")