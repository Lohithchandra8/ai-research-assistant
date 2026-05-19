import fitz
import os
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI
import chromadb

load_dotenv()

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    return full_text

def split_into_chunks(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
        length_function=len
    )
    return splitter.split_text(text)

def store_in_chromadb(chunks):
    client = chromadb.PersistentClient(path="./chroma_db")
    try:
        client.delete_collection("research_papers")
    except:
        pass
    collection = client.create_collection("research_papers")
    embeddings_model = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=os.getenv("OPENAI_API_KEY")
    )
    print("Embedding all chunks...")
    embeddings = embeddings_model.embed_documents(chunks)
    collection.add(
        embeddings=embeddings,
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )
    print(f"Stored {collection.count()} chunks!\n")
    return collection, embeddings_model

def search_similar_chunks(question, collection, embeddings_model):
    question_embedding = embeddings_model.embed_query(question)
    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=5
    )
    return results["documents"][0]

def generate_answer(question, relevant_chunks):
    print(f"Question: {question}")
    print("-" * 40)
    
    # Combine chunks into context
    context = "\n\n".join(relevant_chunks)
    
    # Call OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """You are a helpful research assistant.
Answer ONLY using the context provided below.
If the answer is not in the context, say 'I cannot find this in the document.'
Be clear and concise.

Context:
""" + context
            },
            {
                "role": "user",
                "content": question
            }
        ]
    )
    
    answer = response.choices[0].message.content
    print(f"\nAnswer:\n{answer}")
    return answer

# Run the full RAG pipeline
if __name__ == "__main__":
    # Step 1-4: ingest the PDF
    text = extract_text_from_pdf("backend/test_paper.pdf")
    chunks = split_into_chunks(text)
    collection, embeddings_model = store_in_chromadb(chunks)
    
    # Step 5: find relevant chunks
    question = "What is the attention mechanism and how does it work?"
    relevant_chunks = search_similar_chunks(question, collection, embeddings_model)
    
    # Step 6: generate answer
    generate_answer(question, relevant_chunks)