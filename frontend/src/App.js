import { useState } from "react";

const API = "https://ai-research-assistant-backend-t5bn.onrender.com";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const uploadPDF = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadedFile(file.name);
      setMessages([{
        role: "assistant",
        text: `✅ Uploaded "${file.name}" successfully! I found ${data.chunks} chunks. Ask me anything about it.`
      }]);
    } catch (err) {
      alert("Upload failed. Make sure the backend is running.");
    }
    setUploading(false);
  };

  const sendQuestion = async () => {
    if (!question.trim() || !uploadedFile) return;
    const userMsg = { role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      alert("Chat failed. Make sure the backend is running.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.app}>
      <div style={styles.sidebar}>
        <h1 style={styles.logo}>📄 ResearchAI</h1>
        <p style={styles.tagline}>Upload a paper, ask anything</p>
        <label style={styles.uploadBtn}>
          {uploading ? "Processing..." : "Upload PDF"}
          <input
            type="file"
            accept=".pdf"
            onChange={uploadPDF}
            style={{ display: "none" }}
          />
        </label>
        {uploadedFile && (
          <div style={styles.fileChip}>
            📎 {uploadedFile}
          </div>
        )}
      </div>

      <div style={styles.main}>
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.empty}>
              <p>👆 Upload a PDF to get started</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={msg.role === "user" ? styles.userMsg : styles.aiMsg}>
              <div style={styles.msgText}>{msg.text}</div>
              {msg.sources && (
                <details style={styles.sources}>
                  <summary style={styles.sourceTitle}>📚 View sources ({msg.sources.length})</summary>
                  {msg.sources.map((src, j) => (
                    <div key={j} style={styles.sourceChunk}>
                      <strong>Source {j + 1}:</strong> {src.slice(0, 200)}...
                    </div>
                  ))}
                </details>
              )}
            </div>
          ))}
          {loading && <div style={styles.aiMsg}><div style={styles.msgText}>Thinking...</div></div>}
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
            placeholder={uploadedFile ? "Ask a question about your paper..." : "Upload a PDF first"}
            disabled={!uploadedFile || loading}
          />
          <button
            style={styles.sendBtn}
            onClick={sendQuestion}
            disabled={!uploadedFile || loading || !question.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", fontFamily: "sans-serif", background: "#f9f9f9" },
  sidebar: { width: 240, background: "#1a1a2e", padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  logo: { color: "#fff", fontSize: 20, margin: 0 },
  tagline: { color: "#aaa", fontSize: 13, margin: 0 },
  uploadBtn: { background: "#4f8ef7", color: "#fff", padding: "10px 16px", borderRadius: 8, cursor: "pointer", textAlign: "center", fontSize: 14 },
  fileChip: { background: "#2a2a4a", color: "#ccc", padding: "8px 12px", borderRadius: 8, fontSize: 12, wordBreak: "break-all" },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  messages: { flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 },
  empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#aaa", fontSize: 18 },
  userMsg: { alignSelf: "flex-end", background: "#4f8ef7", color: "#fff", padding: "12px 16px", borderRadius: 12, maxWidth: "70%" },
  aiMsg: { alignSelf: "flex-start", background: "#fff", border: "1px solid #eee", padding: "12px 16px", borderRadius: 12, maxWidth: "70%" },
  msgText: { fontSize: 15, lineHeight: 1.6 },
  sources: { marginTop: 10 },
  sourceTitle: { fontSize: 12, color: "#888", cursor: "pointer" },
  sourceChunk: { background: "#f5f5f5", padding: "8px 12px", borderRadius: 6, fontSize: 12, color: "#555", marginTop: 6 },
  inputRow: { display: "flex", gap: 8, padding: 16, borderTop: "1px solid #eee", background: "#fff" },
  input: { flex: 1, padding: "12px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, outline: "none" },
  sendBtn: { background: "#4f8ef7", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 8, cursor: "pointer", fontSize: 15 },
};
