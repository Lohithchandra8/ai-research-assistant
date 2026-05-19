from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
from backend.rag import extract_text_from_pdf, split_into_chunks, store_in_chromadb, search_similar_chunks, generate_answer
import chromadb
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow React frontend to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store collection and embeddings model in memory
db_state = {
    "collection": None,
    "embeddings_model": None
}

class ChatRequest(BaseModel):
    question: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    # Save uploaded file
    file_path = f"backend/uploads/{file.filename}"
    os.makedirs("backend/uploads", exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run RAG pipeline
    text = extract_text_from_pdf(file_path)
    chunks = split_into_chunks(text)
    collection, embeddings_model = store_in_chromadb(chunks)
    
    # Save to state
    db_state["collection"] = collection
    db_state["embeddings_model"] = embeddings_model
    
    return {
        "message": "PDF uploaded and processed successfully",
        "filename": file.filename,
        "chunks": len(chunks)
    }

@app.post("/chat")
def chat(request: ChatRequest):
    if db_state["collection"] is None:
        return {"error": "No document uploaded yet. Please upload a PDF first."}
    
    relevant_chunks = search_similar_chunks(
        request.question,
        db_state["collection"],
        db_state["embeddings_model"]
    )
    
    answer = generate_answer(request.question, relevant_chunks)
    
    return {
        "question": request.question,
        "answer": answer,
        "sources": relevant_chunks
    }

@app.get("/health")
def health():
    return {"status": "ok"}